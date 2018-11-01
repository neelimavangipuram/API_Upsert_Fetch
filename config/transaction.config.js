module.exports = {
    // Express server port
    PORT: 1984,

    // Time after which a request should time out.
    SERVER_REQUEST_TIMEOUT_IN_SECONDS: 10,

    // Mongo DB connection string with the db username, password, hostname, port and db name.
    MONGO_CONN_STRING: 'mongodb://nvangipu:mLab1992@ds147073.mlab.com:47073/interview_challenge',

    // Collection to which all the transactions are to be stored.
    COLLECTION: 'Transaction',

    // Max size of records to be written to database in a single bulk insert operation.
    BULK_INSERT_SIZE: 5,

    // Minimum number of transactions to consider for nomination for recurring nature.
    MINIMUM_TRANSACTIONS_FOR_RECURRING: 5
};