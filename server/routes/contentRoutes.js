const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');

const {
    getContent,
    getPageContent,
    upsertContent,
    deleteContent
} = require('../controllers/contentControllers');

// Public reads so the hotel website can consume its editable content.
router.get('/', getContent);
router.get('/:page', getPageContent);

// CMS writes are admin-only.
router.post('/', authMiddleware, allowedRoles(['admin']), upsertContent);
router.put('/:id', authMiddleware, allowedRoles(['admin']), upsertContent);
router.delete('/:id', authMiddleware, allowedRoles(['admin']), deleteContent);

module.exports = router;
