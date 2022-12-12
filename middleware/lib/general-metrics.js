const client = require("prom-client");
const fs = require("fs");
const path = require("path");
const {safeMetricName} = require("../utils");
const register = client.register;
const methodRegistryCounters = {};
const domainRegistryCounters = {};
register.setDefaultLabels({
    app: "csc-metrics"
});

const requestTimerMetric = new client.Histogram({
    name: "request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["action", "code", "domain", "method", "operation"],
    buckets: [0.1, 0.5, 0.95, 0.99, 3, 5] // 0.1 to 5 seconds
});

register.registerMetric(requestTimerMetric);

const counterDomains = new client.Gauge({
    name: `domains_count`, help: `Counter for domains registered in API-Hub`
});

register.registerMetric(counterDomains);

function handleRequestsForMetrics(request, response, next) {
    const {method, url} = request;
    /** If the request comes from Prometheus, don't count it */
    if(url === "/metrics" || url.includes("/metrics")) {
        return next();
    }

    _requestMethodCounter(method);
    const end = requestTimerMetric.startTimer();
    response.on("finish", () => {
        const urlParts = url.split("/");
        let action = url, domain = "", operation = "generic-request";
        if (urlParts.length >= 4) {
            action = urlParts[1];
            domain = urlParts[2];
            operation = urlParts[3];
        }

        end({action, code: response.statusCode, domain, method, operation});
    });

    next();
}

function updateMetrics(rootFolder) {
    let domains = fs.readdirSync(rootFolder);
    counterDomains.set(domains.length);
    domains.forEach(domain => {
        const {anchorsCount, bricksCount} = _countContentForDomain(path.join(rootFolder, domain));
        if (!domainRegistryCounters[domain]) {
            const anchorsCounter = new client.Gauge({
                name: safeMetricName(`domain_${domain}_anchors_count`), help: `Gauge for anchors on ${domain} domain`
            });
            const bricksCounter = new client.Gauge({
                name: safeMetricName(`domain_${domain}_bricks_count`), help: `Gauge for bricks on ${domain} domain`
            });

            domainRegistryCounters[domain] = {
                anchorsCounter: anchorsCounter, bricksCounter: bricksCounter
            };
        }

        domainRegistryCounters[domain].anchorsCounter.set(anchorsCount);
        domainRegistryCounters[domain].bricksCounter.set(bricksCount);
    });

    return result;
}

function _countAnchors(srcPath) {
    const anchors = fs.readdirSync(srcPath);
    return anchors.length;
}

function _countBricks(srcPath) {
    let bricksCount = 0;
    const bricksLeadingFolders = fs.readdirSync(srcPath);
    bricksLeadingFolders.forEach(folder => {
        const bricks = fs.readdirSync(path.join(srcPath, folder));
        bricksCount += bricks.length;
    });

    return bricksCount;
}

function _countContentForDomain(srcPath) {
    const anchorsCount = _countAnchors(path.join(srcPath, "anchors"));
    const bricksCount = _countBricks(path.join(srcPath, "brick-storage"));

    return {anchorsCount, bricksCount};
}

function _requestMethodCounter(method) {
    if (!methodRegistryCounters[method]) {
        const counterMetric = new client.Counter({
            name: `${method.toLowerCase()}_count`, help: `Counter for ${method} method requests`
        });

        methodRegistryCounters[method] = counterMetric;
        register.registerMetric(counterMetric);
    }

    methodRegistryCounters[method].inc();
}

module.exports = {
    updateMetrics, handleRequestsForMetrics
};