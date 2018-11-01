const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const transaction = require('./routes/transaction.route');
const config = require('./config/transaction.config')

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use('/transaction', transaction);

let port = config.PORT;

var mongoDB = config.MONGO_CONN_STRING;
mongoose.connect(mongoDB, { useNewUrlParser: true }, function (err, db) {
    if (!err) {
        console.log("Connected to MongoDB! ");
    }
});

mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const server = app.listen(port, () => {
    console.log('The app is running at - http://localhost:' + port);
});
server.timeout = config.SERVER_CONNECTION_TIMEOUT_IN_SECONDS*1000;