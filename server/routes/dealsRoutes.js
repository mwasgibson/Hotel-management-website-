const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');
const { getDeals, getAllDeals, getDeal, addDeal, updateDeal, deleteDeal, restoreDeal, previewPromoCode } = require('../controllers/dealsControllers');

router.get('/', getDeals);   // public
router.post('/preview-code', previewPromoCode);   // public — guests browsing without an account should still see the discount before creating one
router.get('/admin', authMiddleware, allowedRoles(['admin']), getAllDeals);   // must come before /:id
router.get('/:id', authMiddleware, allowedRoles(['admin']), getDeal);
router.post('/', authMiddleware, allowedRoles(['admin']), addDeal);
router.put('/:id', authMiddleware, allowedRoles(['admin']), updateDeal);
router.delete('/:id', authMiddleware, allowedRoles(['admin']), deleteDeal);
router.patch('/:id/restore', authMiddleware, allowedRoles(['admin']), restoreDeal);

module.exports = router;