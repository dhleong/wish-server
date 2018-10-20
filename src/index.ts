
import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "koa-router";
import serve from "koa-static";

import { InputError } from "./errors";
import { logger } from "./log";
import { createRoutes } from "./routes";
import { init as initPush } from "./services/push";
import { init as initRedis } from "./services/redis";

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
    router.use("/v1", createRoutes().routes());

    app.use(async (ctx, next) => {
        try {
            await next();
        } catch (e) {
            if (e instanceof InputError) {
                ctx.status = 400;
                ctx.body = {error: e.message};
                logger.warn(`InputError @${ctx.url}`, {error: e.message});
            } else {
                logger.error(`Unhandled error @${ctx.url}`, {error: e});
                ctx.status = 500;
            }
        }
    });

    app.use(bodyParser());
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
    await initRedis();
}

async function run() {
    await initServices();

    initServer();
}

// start the server
run().catch(e => {
    logger.warn("Unhandled exception on:", {error: e});
    process.exit(1);
});
