const db = require('../config/db');
const { r2, BUCKET } = require('../config/s3');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const logAudit = require('../utils/auditLogger');
const moveToTrash = require('../utils/trashLogger');

const CATEGORIES = ['menu', 'policy', 'floor_plan', 'brochure', 'other'];
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

async function withDownloadUrl(doc) {
    const download_url = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: BUCKET, Key: doc.file_key }),
        { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
    );
    return { ...doc, download_url };
}

function audit(req, action, entityId, description) {
    logAudit({ req, action, entityType: 'document', entityId, description })
        .catch(err => console.error('Audit log error:', err));
}

exports.getDocuments = (req, res) => {
    db.query('SELECT * FROM documents ORDER BY created_at DESC', async (err, results) => {
        if (err) {
            console.error('Error fetching documents:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        try {
            res.json(await Promise.all(results.map(withDownloadUrl)));
        } catch (e) {
            console.error('Error signing document URLs:', e);
            res.status(500).json({ error: 'Storage error' });
        }
    });
};

exports.getDocument = (req, res) => {
    db.query('SELECT * FROM documents WHERE id = ?', [req.params.id], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Document not found' });
        try {
            res.json(await withDownloadUrl(results[0]));
        } catch (e) {
            console.error('Error signing document URL:', e);
            res.status(500).json({ error: 'Storage error' });
        }
    });
};

exports.uploadDocument = async (req, res) => {
    const { title, category } = req.body;

    if (!req.file) return res.status(400).json({ error: 'A PDF file is required' });
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (category && !CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
    }

    const fileKey = `documents/${crypto.randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    try {
        await r2.send(new PutObjectCommand({
            Bucket: BUCKET,
            Key: fileKey,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }));
    } catch (e) {
        console.error('Error uploading to R2:', e);
        return res.status(500).json({ error: 'Storage upload failed' });
    }

    const sql = 'INSERT INTO documents (title, category, file_key, file_name, mime_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [title, category || 'other', fileKey, req.file.originalname, req.file.mimetype, req.file.size, req.user?.id || null], async (err, result) => {
        if (err) {
            console.error('Error saving document record:', err);
            try { await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey })); } catch { /* best effort */ }
            return res.status(500).json({ error: 'Database error' });
        }
        db.query('SELECT * FROM documents WHERE id = ?', [result.insertId], async (err2, rows) => {
            if (err2 || rows.length === 0) return res.status(201).json({ message: 'Document uploaded', id: result.insertId });
            audit(req, 'CREATE', result.insertId, `Uploaded document "${title}"`);
            res.status(201).json(await withDownloadUrl(rows[0]));
        });
    });
};

exports.deleteDocument = (req, res) => {
    db.query('SELECT * FROM documents WHERE id = ?', [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching document to delete:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) return res.status(404).json({ error: 'Document not found' });

        const doc = results[0];

        // Keep the R2 object. The trash snapshot contains file_key, so the
        // document can actually be restored later.
        moveToTrash({
            entityType: 'document',
            entityId: doc.id,
            entityData: doc,
            deletedBy: req.user?.id || null
        })
            .then(() => {
                db.query('UPDATE documents SET active = 0 WHERE id = ?', [req.params.id], (err2, result) => {
                    if (err2) {
                        console.error('Error soft-deleting document:', err2);
                        return res.status(500).json({ error: 'Database error' });
                    }
                    if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });

                    audit(req, 'DELETE', doc.id, `Moved document "${doc.title}" to trash`);
                    res.json({ message: 'Document moved to trash' });
                });
            })
            .catch(trashErr => {
                console.error('Error moving document to trash:', trashErr);
                res.status(500).json({ error: 'Could not move document to trash' });
            });
    });
};

exports.restoreDocument = (req, res) => {
    db.query('SELECT * FROM documents WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Document not found' });

        const doc = results[0];

        db.query('UPDATE documents SET active = 1 WHERE id = ?', [req.params.id], (err2, result) => {
            if (err2) {
                console.error('Error restoring document record:', err2);
                return res.status(500).json({ error: 'Database error' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Document not found' });

            audit(req, 'RESTORE', doc.id, `Restored document "${doc.title}"`);
            res.json({ message: 'Document restored' });
        });
    });
};
