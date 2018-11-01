const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('../config/transaction.config');

let TransactionSchema = new Schema({
    name: { type: String, required: true },
    company: { type: String, required: true },
    date: { type: Date, default: Date.now },
    days: { type: Number, required: true },
    amount: { type: Number, required: true },
    trans_id: { type: String, required: true },
    user_id: { type: String, required: true },
});

// Export the model
module.exports = mongoose.model(config.COLLECTION, TransactionSchema);