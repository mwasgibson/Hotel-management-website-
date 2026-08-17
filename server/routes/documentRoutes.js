const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');
const upload = require('../middleware/uploadMiddleware');
const { getDocuments, getDocument, uploadDocument, deleteDocument, restoreDocument } = require('../controllers/documentControllers');

// Wraps multer so file-type/size rejections come back as a clear 400 instead
// of falling through to the app's generic 500 error handler.
function handleUpload(req, res, next) {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        next();
    });
}

// Menus/policies/brochures are guest-facing, so listing and downloading stay public.
router.get('/', getDocuments);
router.get('/:id', getDocument);
router.post('/', authMiddleware, allowedRoles(['admin']), handleUpload, uploadDocument);
router.delete('/:id', authMiddleware, allowedRoles(['admin']), deleteDocument);
router.patch('/:id', authMiddleware, allowedRoles(['admin']), restoreDocument);

module.exports = router;