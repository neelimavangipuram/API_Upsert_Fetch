const express = require('express');
const router = express.Router();
const transaction_controller = require('../controllers/transaction.controller');

// For testing timeout
router.get('/testtimeout', transaction_controller.test_timeout);

// For receiving the entire recurring transactions for all users in database
router.get('/recurring', transaction_controller.transaction_get_recurring);

// For creating a list of transactions in database
router.post('/create', transaction_controller.transaction_create);

module.exports = router;