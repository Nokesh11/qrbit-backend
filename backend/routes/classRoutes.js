const express = require('express');
const router = express.Router();
const { getClasses, createClass } = require('../controllers/classController');

router.get('/', getClasses);
router.post('/', createClass);

module.exports = router;
