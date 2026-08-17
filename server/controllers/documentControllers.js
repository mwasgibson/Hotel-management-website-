const db = require('../config/db');
const { r2, BUCKET } = require('../config/s3');
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const CATEGORIES = ['menu', 'policy', 'floor_plan', 'brochure', 'other'];
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Bucket is private — every response signs a fresh, time-limited download URL
// rather than storing/reusing a public link.
async function withDownloadUrl(doc) {
    const download_url = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: BUCKET, Key: doc.file_key }),
        { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
    );
    return { ...doc, download_url };
}

exports.getDocuments = (req, res) => {
    db.query('SELECT * FROM documents ORDER BY created_at DESC', async (err, results) => {
        if (err) {
            console.error('Error fetching documents:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        try {
            const withUrls = await Promise.all(results.map(withDownloadUrl));
            res.json(withUrls);
        } catch (e) {
            console.error('Error signing document URLs:', e);
            res.status(500).json({ error: 'Storage error' });
        }
    });
};

exports.getDocument = (req, res) => {
    db.query('SELECT * FROM documents WHERE id = ?', [req.params.id], async (err, results) => {
        if (err) {
            console.error('Error fetching document:', err);
            return res.status(500).json({ error: 'Database error' });
        }
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
            // The file is already in R2 at this point but the DB write failed —
            // clean it up so we don't leak orphaned objects in the bucket.
            try { await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey })); } catch { /* best effort */ }
            return res.status(500).json({ error: 'Database error' });
        }
        db.query('SELECT * FROM documents WHERE id = ?', [result.insertId], async (err2, rows) => {
            if (err2 || rows.length === 0) {
                return res.status(201).json({ message: 'Document uploaded', id: result.insertId });
            }
            res.status(201).json(await withDownloadUrl(rows[0]));
        });
    });
};

exports.deleteDocument = (req, res) => {
    db.query('SELECT * FROM documents WHERE id = ?', [req.params.id], async (err, results) => {
        if (err) {
            console.error('Error fetching document to delete:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (results.length === 0) return res.status(404).json({ error: 'Document not found' });

        const doc = results[0];
        try {
            await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: doc.file_key }));
        } catch (e) {
            console.error('Error deleting from R2:', e);
            return res.status(500).json({ error: 'Storage delete failed' });
        }

        db.query('UPDATE documents SET active = 0 WHERE id = ?', [req.params.id], (err2) => {
            if (err2) {
                console.error('Error deleting document record:', err2);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Document deleted' });
        });
    });
};

exports.restoreDocument = (req, res) => {
    db.query('SELECT * FROM documents WHERE id = ?', [req.params.id], async (err, results) => {
        if (err) {
            console.error('Error fetching document:', err);
            return res.status(500).json({error: 'Database error'});
        }
        if (results.length === 0) {
            return res.status(404).json({error: 'Document not found'});
        }
        const doc = results[0];
        db.query('UPDATE documents SET active = 1 WHERE id = ?', [req.params.id], (err2) => {
            if (err2) {
                console.error('Error restoring document record:', err2);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ message: 'Document restored' });
        });
    });
};