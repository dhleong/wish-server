import * as Koa from "koa";

import { InputError, requireInput, requireKey } from "../errors";
import { logger } from "../log";
import * as push from "../services/push";

export async function getVapidPublicKey(ctx: Koa.Context) {
    ctx.body = { key: push.getVapidPublicKey() };
}

export async function deleteChannel(ctx: Koa.Context) {
    const channelId: string = requireKey(ctx.params, "channelId");
    const auth = requireKey(ctx.request.body as {auth: any}, "auth");

    await push.deleteChannel(channelId, auth);

    ctx.status = 204;
}

export async function register(ctx: Koa.Context) {
    if (!ctx.request.body) {
        throw new InputError();
    }

    const params = ctx.request.body as push.IWatchParams<any>;
    requireKey(params, "auth");
    requireKey(params, "context");
    requireKey(params, "userId");

    // the client could potentially cancel the channel early
    ctx.body = await push.register(params);
}

export async function send(ctx: Koa.Context) {
    if (ctx.headers["x-goog-resource-state"]) {
        return sendGapi(ctx);
    }

    logger.warn("No resource state provided with push attempt", {headers: ctx.headers});
}

async function sendGapi(ctx: Koa.Context) {
    const resourceState: string = ctx.headers["x-goog-resource-state"];
    if (resourceState !== "update") {
        // probably a sync message; safe to ignore
        return;
    }

    const changed: string = ctx.headers["x-goog-changed"];
    if (!changed || !changed.includes("content")) {
        // not interested
        return;
    }

    const channel = ctx.headers["x-goog-channel-id"];
    const tokenStr: string = requireKey(ctx.headers, "x-goog-channel-token");
    const {
        userId,
    } = JSON.parse(tokenStr);

    await push.send(channel, userId, {
        ...(ctx.headers),
        ...(ctx.request.body),
    });
    ctx.status = 201;
}
