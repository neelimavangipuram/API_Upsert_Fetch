const _ = require('lodash');
const Promise = require('promise');
const async = require('async');

const Transaction = require('../models/transaction.model');
const config = require('../config/transaction.config');
const cluster = require('./cluster.controller');

// Function to test timeout in express.
exports.test_timeout = function (req, res) {
    setTimeout(function () {
        res.status(200).send('This function is supposed to timeout! You should not be receiving this!');
    }, 15 * 1000);
}

// Makes a group of user + company to feed to the clustering algorithm for prediction.
function transaction_get_recurring(req, res) {
    return new Promise(function (resolve, reject) {
        let users = _.uniq(_.map(req.body, 'user_id'));
        let filter = {}
        if (users.length > 0) {
            filter = {
                "user_id": {
                    "$in": users
                }
            }
        }
        Transaction.find(filter, function (err, transactions) {
            if (err) return err.message;
            const result = _.chain(transactions)
                .groupBy('user_id') // Group by users first
                .mapValues(values => _.chain(values)
                    .groupBy('company') // Form clusters of companies inside the parent user groups.
                    .value()
                )
                .value();
            res.send(cluster.apply_cluster(result));
        });
    });
}

//Differences usually come in the form of reference numbers 
// (e.g., ABC 23XAB vs.ABC YA78P) or dates (ABC 20180901 vs. ABC 20180801)
let companyRegex = /[ -!$%^&*()_+|~=`{}\[\]:\/;<>?,.@#]/g;

function getCompany(inputName) {
    let match = inputName.match(companyRegex);
    let lastIndex = inputName.lastIndexOf(match[match.length - 1]);
    return inputName.substring(0, lastIndex).trim();
}

// Don't use this, rather find difference in days while clustering, this is an overhead, 
// because these values are pull anyway and sorted before sending recurring txns. 
// Returns the difference of days between the current txn and the last done txn.
async function get_days(user_id, company_name, current_date) {
    return new Promise(function (resolve, reject) {
        Transaction
            .find({
                user_id: user_id,
                company: company_name
            })
            .sort({
                'date': -1
            })
            .limit(1)
            .exec(function (err, record) {
                if (err) {
                    console.log(err.message);
                    reject(err);
                }
                if (record && record[0]) resolve(getDiff(current_date, record[0].date));
                resolve(0)
            });
    });
}

// Divide a big array into smaller equal sized chunks.
function chunk_array(big_array, chunk_size) {
    var chunks = [];
    while (big_array.length) {
        chunks.push(big_array.splice(0, chunk_size));
    }
    return chunks;
}

// This creates a set of transactions and writes to database in smaller chunks.
// After inserting to db, this calls the handler for returning recurring functions API and
// returns the recurring transactions for all users for whom transactions are created here.
function transaction_create(req, res) {
    let req_arr = req.body;
    let bulk_updates = [];

    _.forEach(req_arr, function (doc, callback) {
        doc['company'] = getCompany(doc.name);
        bulk_updates.push({
            "updateOne": {
                "filter": {
                    "trans_id": doc.trans_id
                },
                "update": {
                    "$set": {
                        "name": doc.name,
                        "company": doc.company,
                        "amount": doc.amount,
                        "date": doc.date,
                        "user_id": doc.user_id,
                        "trans_id": doc.trans_id
                    }
                },
                "upsert": true, // Avoid duplication of transactions
                "multi": true
            }
        });
    });

    // Break the txns array into smaller chunks based on the size set in config file
    let bulks = chunk_array(bulk_updates, config.BULK_INSERT_SIZE);
    let total_bulks = bulks.length;
    async.every(bulks, function (bulk, callback) {
        Transaction.bulkWrite(bulk, function () {
            // Only send the response when all the chunks of transactions have been written to db.
            if (--total_bulks == 0) callback();
        });
    }, function () {
        transaction_get_recurring(req, res);
    });
}

exports.transaction_create = transaction_create;
exports.transaction_get_recurring = transaction_get_recurring;