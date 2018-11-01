const stats = require("stats-lite");
const _ = require('lodash');
const config = require('../config/transaction.config')

function mean_value(values) {
    return Math.round(stats.mean(values));
}

// A custom mode function which will return mean of mode values if there are more than 1 mode
// and will return the same number if all the elements are same and mod becomes invalid
function mode_value(values) {
    if (values.length < 2) return [];
    modes = Array.from(stats.mode(values));
    if (modes.length > 1) {
        return mean_value(modes);
    } else {
        if (modes.length == 0 && (values[0] == values[1])) return values[0];
        return modes;
    }
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
            let docs = _.filter(obj_arr, function (o) { return o.days != 0 })
            var mean_mode = mode_value(_.map(docs, 'days'));
            if (mean_mode > 0) {
                let tolerance = Math.round((mean_mode * config.TOLERANCE_IN_PERCENTAGE) / 100);
                let all_txns = _.filter(docs, function (obj) {
                    // Allow some sort of tolerance in the variation in the number of days.
                    // We can update this value in the transaction.config file.
                    return (obj.days - mean_mode <= tolerance && obj.days - mean_mode >= -(tolerance));
                });
                if (all_txns.length > 0) {
                    let last_date = _.sortBy(all_txns, o => o.date)[all_txns.length - 1].date;
                    let output = {
                        user_id: all_txns[0].user_id,
                        name: all_txns[0].name,
                        next_amt: mean_value(_.map(all_txns, 'amount')),    // Mean of all reccuring txns will give next probable txn amount.
                        next_date: addDays(last_date, mean_mode),   // Adding the mode value of days with the last txn date will give next probable txn date. 
                        txns: all_txns
                    }
                    final_reccuring_list.push(output);
                }
            }
        });
    });
    return final_reccuring_list;
}
