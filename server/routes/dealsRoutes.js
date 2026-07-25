const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const allowedRoles = require('../middleware/allowedRoles');
const { getDeals, addDeal, updateDeal, deleteDeal, previewPromoCode } = require('../controllers/dealsControllers');

router.get('/', getDeals);   // public
router.post('/', authMiddleware, allowedRoles(['admin']), addDeal);
router.put('/:id', authMiddleware, allowedRoles(['admin']), updateDeal);
router.delete('/:id', authMiddleware, allowedRoles(['admin']), deleteDeal);
router.post('/preview-code', previewPromoCode);   // public — guests browsing without an account should still see the discount before creating one

module.exports = router;