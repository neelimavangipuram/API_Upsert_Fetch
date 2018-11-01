const express = require('express');
const router = express.Router();
const transaction_controller = require('../controllers/transaction.controller');

router.get('/testtimeout', transaction_controller.test);
router.get('/reccuring', transaction_controller.transaction_get_reccuring);
router.post('/create', transaction_controller.transaction_create);

module.exports = router;