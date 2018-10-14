
import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "koa-router";
import serve from "koa-static";

import { logger } from "./log";
import { createRoutes } from "./routes";
import { init as initPush } from "./services/push";

const {
    CORS_HOST,
    PORT,
} = process.env;

const app = new Koa();
const router = new Router();

const corsMiddleware = cors({
    origin: CORS_HOST,
});

function initServer() {
    app.use(bodyParser());

    router.use("/v1", createRoutes().routes());

    app.use(corsMiddleware);
    app.use(serve("static"));
    app.use(router.routes());

    const server = app.listen(PORT, () => {
        const addr = server.address();
        const info = typeof addr === "string"
            ? addr
            : `${addr.address}:${addr.port}`;

        logger.info(`Listening on ${info}`);
    });
}

async function initServices() {
    await initPush();
}

async function run() {
    await initServices();

    initServer();
}

// start the server
run().catch(e => {
    logger.warn("Unhandled exception:", e);
    process.exit(1);
});
