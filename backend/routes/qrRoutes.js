const express = require('express');
const router = express.Router();
const { generateQR, validateQR } = require('../controllers/qrController');

router.get('/qr', generateQR);
router.get('/validate-qr', validateQR);

module.exports = router;
