const middlewares = require("./middlewares");

function safeMetricName(metricName) {
    if (!metricName.match(/^[a-zA-Z_:]/)) {
        metricName = '_' + metricName;
    }

    return (metricName).replace(/[^a-zA-Z0-9_:]/g, '_');

}

module.exports = {
    middlewares,
    safeMetricName
};