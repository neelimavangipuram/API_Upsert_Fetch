const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const transaction = require('./routes/transaction.route');
var timeout = require('connect-timeout'); //express v4

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use('/transaction', transaction);

app.use(timeout(10000));
app.use(haltOnTimedout);

function haltOnTimedout(req, res, next){
  if (!req.timedout) next();
}


let port = 1984;

//Set up default mongoose connection
var mongoDB = 'mongodb://fugazi_user:fugazi1992@ds241723.mlab.com:41723/fugazi';
mongoose.connect(mongoDB, { useNewUrlParser: true }, function (err, db) {
    if (!err) {
        console.log("Connected to MongoDB! ");
    }
});

// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;

//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.listen(port, () => {
    console.log('The app is running at - http://localhost:' + port);
});