const _ = require('lodash');
const Promise = require('promise');
const async = require('async');
const Transaction = require('../models/transaction.model');
const config = require('../config/transaction.config');
const cluster = require('./cluster.controller');

// Function to test timeout functionality in express.
exports.test = function (req, res) {
    setTimeout(function () {
        res.status(200).send('Greetings from the Test controller!');
    }, 15 * 1000);
}

// Makes a group of user + company to feed to the model which predicts amount and date for next txn for that user.
function transaction_get_reccuring(req, res) {
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
                .groupBy('user_id')
                .mapValues(values => _.chain(values)
                    .groupBy('company')
                    .value()
                )
                .value()
            res.send(cluster.apply_cluster(result));
        });
    });
}

//Differences usually come in the form of reference numbers (e.g., ABC 23XAB vs.
//ABC YA78P) or dates (ABC 20180901 vs. ABC 20180801)
let companyRegex = /[ -!$%^&*()_+|~=`{}\[\]:\/;<>?,.@#]/g;
function getCompany(inputName) {
    let match = inputName.match(companyRegex);
    let lastIndex = inputName.lastIndexOf(match[match.length - 1]);
    return inputName.substring(0, lastIndex).trim();
}

function getDiff(current, last) {
    let oneDay = 1000 * 60 * 60 * 24;
    let lastMs = new Date(last).getTime();
    let currentMs = new Date(current).getTime();
    let diffMs = currentMs - lastMs;
    return Math.round(diffMs / oneDay);
}

// Returns the difference of days between the current txn and the last done txn.
async function getDays(userId, companyName, currentDate) {
    return new Promise(function (resolve, reject) {
        Transaction
            .find({
                user_id: userId,
                company: companyName
            })
            .sort({ 'date': -1 })
            .limit(1)
            .exec(function (err, record) {
                if (err) {
                    console.log(err.message);
                    reject(err);
                }
                if (record && record[0]) resolve(getDiff(currentDate, record[0].date));
                resolve(0)
            });
    });
}

function chunkArray(myArray, chunk_size) {
    var results = [];
    while (myArray.length) {
        results.push(myArray.splice(0, chunk_size));
    }
    return results;
}

// After transaction is created, we need to return the reccuring transactions for that user.
// So reuse the function that is used to return the recurring transactions from the other request. (Line 61)
function transaction_create(req, res) {
    let reqArr = req.body;
    let bulkUpdates = [];
    let total_records = req.body.length;

    async.every(reqArr, function (doc, callback) {
        doc['company'] = getCompany(doc.name);
        getDays(doc.user_id, doc.company, doc.date)
            .then(function (days) {
                bulkUpdates.push({
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
                                "trans_id": doc.trans_id,
                                "days": days
                            }
                        },
                        "upsert": true,     //Avoid duplication of transactions
                        "multi": true
                    }
                });
                if (bulkUpdates.length == total_records) callback();
            });

    }, function (err) {
        if (err) return console.log(err);
        // Break the txns array into smaller chunks based on the size set in config file
        let bulks = chunkArray(bulkUpdates, config.BULK_INSERT_SIZE);
        let total_bulks = bulks.length;
        async.every(bulks, function (bulk, callback) {
            Transaction.bulkWrite(bulk, function () {
                if (--total_bulks == 0) callback();
            });
        }, function () {
            transaction_get_reccuring(req, res);
        });
    })
}

exports.transaction_create = transaction_create;
exports.transaction_get_reccuring = transaction_get_reccuring;