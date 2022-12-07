const fs = require("fs");
const path = require("path");
const client = require("prom-client");
const register = client.register;
client.collectDefaultMetrics({register});

let domainsPath;
let currentStaticMetrics = {};

const {responseModifierMiddleware, requestBodyJSONMiddleware} = require('./utils').middlewares;
const {anchoringMetrics, brickingMetrics, generalMetrics} = require("./lib");

async function metricsHandler(req, res) {
    const queryParams = req.query;
    if (!queryParams || !queryParams.mode) {
        await generalMetrics.sendLiveMetrics(req, res);
        return;
    }

    switch (queryParams.mode) {
        case "live": {
            await generalMetrics.sendLiveMetrics(req, res);
            break;
        }

        case "static": {
            const newMetrics = generalMetrics.getStaticMetrics(domainsPath, currentStaticMetrics);
            console.log(newMetrics);
            currentStaticMetrics = {...newMetrics};
            res.setHeader("Content-Type", register.contentType);
            res.send(200, await register.metrics());
            break;
        }

        default:
            res.send(404);
    }
}

function MetricsMiddleware(server) {
    console.log("[MetricsMiddleware] Initiated!");
    domainsPath = path.join(__dirname, server.config.storage, "external-volume", "domains");

    server.use(generalMetrics.handleRequestsForMetrics);
    server.use(`/metrics`, responseModifierMiddleware);
    server.use(`/metrics`, requestBodyJSONMiddleware);

    server.get("/anchor/*", anchoringMetrics.anchoringMetricsHandler);
    server.put("/anchor/*", anchoringMetrics.anchoringMetricsHandler);

    server.get("/bricking/*", brickingMetrics.brickingMetricsHandler);
    server.put("/bricking/*", brickingMetrics.brickingMetricsHandler);

    server.get("/metrics", metricsHandler);
}

module.exports = MetricsMiddleware;