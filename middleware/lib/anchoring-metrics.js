const client = require("prom-client");
const { getRequestDuration, safeMetricName } = require('../utils');
const register = client.register;

const anchoringRequestsMetric = new client.Histogram({
    name: "anchoring_duration_seconds",
    help: "Anchoring requests metrics",
    labelNames: ["action", "code", "domain", "method", "operation", "responseTime"],
    buckets: [0.1, 0.5, 0.95, 0.99, 3, 5] // 0.1 to 5 seconds
});

register.registerMetric(anchoringRequestsMetric);
const anchoringOperationsRequestTimers = {};

function anchoringMetricsHandler(request, response, next) {
    const {method, url} = request;
    const urlSegments = url.split("/");
    if (urlSegments.length < 4) {
        return null;
    }

    const start = process.hrtime();
    const action = urlSegments[1], domain = urlSegments[2], operation = urlSegments[3];
    const end = anchoringRequestsMetric.startTimer();

    if(!anchoringOperationsRequestTimers[operation]) {
        const gaugeMetric = new client.Gauge({
            name: safeMetricName(`${operation}_execution_time`),
            help: `${safeMetricName(`${operation}_execution_time`)} Gauge`
        });
        anchoringOperationsRequestTimers[operation] = gaugeMetric;
        register.registerMetric(gaugeMetric);
    }
    response.on("finish", () => {
        const responseTime = getRequestDuration(start); // in milliseconds
        anchoringOperationsRequestTimers[operation].set(responseTime);
        end({action, code: response.statusCode, domain, method, operation, responseTime});
    });

    next();
}

module.exports = {
    anchoringMetricsHandler
};