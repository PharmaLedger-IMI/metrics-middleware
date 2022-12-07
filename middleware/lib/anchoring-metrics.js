const client = require("prom-client");
const register = client.register;

const anchoringRequestsMetric = new client.Histogram({
    name: "anchoring_duration_seconds",
    help: "Anchoring requests metrics",
    labelNames: ["action", "code", "domain", "method", "operation", "responseTime"],
    buckets: [0.5, 0.95, 0.99, 3, 5] // 0.1 to 5 seconds
});

register.registerMetric(anchoringRequestsMetric);

function anchoringMetricsHandler(request, response, next) {
    const {method, url} = request;
    const urlSegments = url.split("/");
    if (urlSegments.length < 4) {
        return null;
    }

    const action = urlSegments[1], domain = urlSegments[2], operation = urlSegments[3];
    const end = anchoringRequestsMetric.startTimer();
    response.on("finish", () => {
        end({action, code: response.statusCode, domain, method, operation});
    });

    next();
}

module.exports = {
    anchoringMetricsHandler
};