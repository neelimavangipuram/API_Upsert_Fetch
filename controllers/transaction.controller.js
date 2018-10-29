const Transaction = require('../models/transaction.model'),
    _ = require('lodash');

//Simple version, without validation or sanitation

function getCompany(inputName) {

}
// Not required: Delete this function
exports.test = function (req, res) {
    setTimeout(function () {
        res.status(200).send('Greetings from the Test controller!');
    }, 12000);
}

// Not required: Delete this function 
exports.transaction_details = function (req, res) {
    Transaction.findById(req.params.id, function (err, transaction) {
        if (err) return err.message;
        res.send(transaction);
    })
}

// Not required: Delete this function 
exports.transaction_update = function (req, res) {
    Transaction.findByIdAndUpdate(req.params.id, {
        $set: req.body
    }, function (err, transaction) {
        if (err) return err.message;
        res.send('Transaction udpated.');
    });
}

// Right now this returns grouped (Company + Amount) values.
// Todo: Need to filter out only actual reccuring transactions from these.
function transaction_get_reccuring(req, res) {
    Transaction.find({
        user_id: (req.params.user_id || req.body.user_id)
    }, function (err, transactions) {
        if (err) return err.message;
        console.log('transactions', transactions)
        const result = _.chain(transactions)
            .groupBy('company')
            .mapValues(values => _.chain(values)
                .groupBy('amount')
                .value()
            )
            .value()
        res.send(result);
    });
}

// After transaction is created, we need to return the reccuring transactions for that user.
// So reuse the function that is used to return the recurring transactions from the other request. (Line 61)
function transaction_create(req, res) {
    let reqArr = req.body;
    let bulkUpdates = [];
    reqArr.forEach(function (item) {
        item['company'] = item.name.split(' ')[0];
    });

    //    let transaction = new Transaction({
    //        name: req.body.name,
    //        company: req.body.name.split(' ')[0],
    //        date: new Date(req.body.date),
    //        amount: req.body.amount,
    //        trans_id: req.body.trans_id,
    //        user_id: req.body.user_id
    //    });
    //

    reqArr.forEach(function (doc) {
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
                        "user_id": doc.user_id
                    }
                },
                "upsert": true,
                "multi": true
            }
        });

        if (bulkUpdates.length === 1000) {
            Transaction.bulkWrite(bulkUpdates).then(function (result) {
                console.log('After 1000 records ', result);
            });
            bulkUpdates = [];
        }

    });

    if (bulkUpdates.length > 0) {
        Transaction.bulkWrite(bulkUpdates).then(function (result) {
            setTimeout(function () {
                res.status(200).json(result);
                console.log('Successfully inserted ', result['result']['nInserted'] + ' records.');
                console.log('Records ', result['result']['insertedIds']);
            }, 10000);


        });
    }
}

exports.transaction_get_reccuring = transaction_get_reccuring;
exports.transaction_create = transaction_create;