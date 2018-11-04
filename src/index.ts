
import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import Router from "koa-router";
import serve from "koa-static";

import { AuthError, ErrorWithCause, InputError } from "./errors";
import { logger } from "./log";
import { createRoutes } from "./routes";
import services from "./services";
import { AuthService } from "./services/auth";
import { DistributedChannelsService } from "./services/channels";
import { init as initProviders, ProviderService } from "./services/provider";
import { init as initRedis } from "./services/redis";
import { SocketIoService } from "./services/sio";
import { SSEService } from "./services/sse";
import { init as initToken, TokenService } from "./services/token";

const {
    CORS_HOST,
    PORT,
} = process.env;

const app = new Koa();
const router = new Router();

const corsMiddleware = cors({
    origin: CORS_HOST,
});

function extraFromError(ctx: Koa.Context, e: ErrorWithCause) {
    ctx.body = {error: e.message};

    const extra: {error: Error} = {error: e};
    if (e.cause) {
        extra.error = e.cause;
    }

    return extra;
}

function initServer() {
    router.use("/v1", createRoutes().routes());

    app.use(async (ctx, next) => {
        try {
            await next();
        } catch (e) {
            if (e instanceof AuthError) {
                ctx.status = 401;
                const extra = extraFromError(ctx, e);
                logger.warn(`AuthError @${ctx.url}`, extra);
            } else if (e instanceof InputError) {
                ctx.status = 400;
                const extra = extraFromError(ctx, e);
                logger.warn(`InputError @${ctx.url}`, extra);
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

        // socket.io service is special and gets init here:
        services.channelTypes.sio = new SocketIoService(server, CORS_HOST);

        logger.info(`Listening on ${info}`);
    });
}

async function initServices() {
    await initProviders();
    await initRedis();
    await initToken();

    services.auth = new AuthService();
    services.channels = new DistributedChannelsService();
    services.provider = new ProviderService();
    services.token = new TokenService();

    services.channelTypes.sse = new SSEService();
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
