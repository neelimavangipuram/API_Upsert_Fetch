const express = require('express');
const router = express.Router();
const transaction_controller = require('../controllers/transaction.controller');

// The below three are not needed, delete them.
// a simple test url to check that all of our files are communicating correctly.
router.get('/test', transaction_controller.test);
router.get('/:id', transaction_controller.transaction_details);
router.put('/:id/update', transaction_controller.transaction_update);

// The below two are the end points that they asked for.
router.post('/create', transaction_controller.transaction_create);
router.get('/reccuring/:user_id', transaction_controller.transaction_get_reccuring);
module.exports = router;