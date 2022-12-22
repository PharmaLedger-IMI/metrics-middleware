const middlewares = require("./middlewares");

function safeMetricName(metricName) {
    if (!metricName.match(/^[a-zA-Z_:]/)) {
        metricName = '_' + metricName;
    }

    return (metricName).replace(/[^a-zA-Z0-9_:]/g, '_');

}

function getRequestDuration(start) {
    const diff = process.hrtime(start);
    return (diff[0] * 1e9 + diff[1]) / 1e6;
}

module.exports = {
    middlewares,
    safeMetricName,
    getRequestDuration
};