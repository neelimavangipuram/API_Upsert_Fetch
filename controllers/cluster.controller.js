const stats = require("stats-lite");
const _ = require('lodash');
const config = require('../config/transaction.config')

function mean_value(values) {
    return Math.round(stats.mean(values));
}

// A custom mode function which will return mode values only if it is 1 or 0.
// When 0, we check if all the records are the same which means that can be used as mode, else returns 0.
function mode_value(values) {
    if (values.length < config.MINIMUM_TRANSACTIONS_FOR_RECCURING) return 0;
    modes = Array.from(stats.mode(values));
    if (modes.length == 0 && (values[0] == values[1])) return values[0];
    else if (modes.length == 1) return modes;
    else return 0;
}

// Returns the difference between two dates.
function getDiff(current, last) {
    let oneDay = 1000 * 60 * 60 * 24;
    let lastMs = new Date(last).getTime();
    let currentMs = new Date(current).getTime();
    let diffMs = currentMs - lastMs;
    return Math.round(diffMs / oneDay);
}

// To find the next occurance of a particular transaction,
// we add the last date with the reccuring peroid.
function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// The user+company group is taken as parameter by this function and
// this will remove the outlier transactions to group all reccuring transactions
// and to find the next potential date and amount of the user's transaction.
exports.apply_cluster = function (user_groups) {
    var final_reccuring_list = [];
    _.forEach(user_groups, function (company_groups) {
        _.forEach(company_groups, function (obj_arr) {
            obj_arr[0].days = 0
            for (var i = 1; i < obj_arr.length; i++) {
                obj_arr[i].days = getDiff(obj_arr[i].date, obj_arr[i - 1].date);
            }
            docs = _.filter(obj_arr, function (o) { return o.days != 0 });
            var mode = mode_value(_.map(docs, 'days'));
            if (mode > 0) {
                let all_txns = _.filter(docs, function (obj) { return obj.days == mode });
                if (all_txns.length > 0) {
                    let last_date = _.sortBy(all_txns, o => o.date)[all_txns.length - 1].date;
                    let output = {
                        user_id: all_txns[0].user_id,
                        name: all_txns[0].name,
                        next_amt: mean_value(_.map(all_txns, 'amount')),    // Mean of all reccuring txns will give next probable txn amount.
                        next_date: addDays(last_date, mode),   // Adding the mode value of days with the last txn date will give next txn date. 
                        txns: all_txns
                    }
                    final_reccuring_list.push(output);
                }
            }
        });
    });
    return _.sortBy(final_reccuring_list, o => o.user_id);
}
