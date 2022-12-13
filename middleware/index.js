const process = require("process");
const path = require("path");
const client = require("prom-client");
const register = client.register;
client.collectDefaultMetrics({register});

let domainsPath;

const {responseModifierMiddleware, requestBodyJSONMiddleware} = require('./utils').middlewares;
const {anchoringMetrics, brickingMetrics, generalMetrics} = require("./lib");

async function metricsHandler(req, res) {
    try {
        generalMetrics.updateMetrics(domainsPath);
        res.setHeader("Content-Type", register.contentType);
        res.send(200, await register.metrics());
    } catch(e) {
        console.error(e);
        res.send(500);
    }
}

function MetricsMiddleware(server) {
    console.log("[MetricsMiddleware] Initiated!");
    domainsPath = path.join(process.cwd(), server.config.storage, "external-volume", "domains");
    server.use(generalMetrics.handleRequestsForMetrics);
    server.use("/metrics", responseModifierMiddleware);
    server.use("/metrics", requestBodyJSONMiddleware);

    server.get("/anchor/*", anchoringMetrics.anchoringMetricsHandler);
    server.put("/anchor/*", anchoringMetrics.anchoringMetricsHandler);

    server.get("/bricking/*", brickingMetrics.brickingMetricsHandler);
    server.put("/bricking/*", brickingMetrics.brickingMetricsHandler);

    server.get("/metrics", metricsHandler);
}

module.exports = MetricsMiddleware;