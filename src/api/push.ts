import * as Koa from "koa";

import { AuthError, requireKey } from "../errors";
import { logger } from "../log";
import * as push from "../services/push";

export async function send(ctx: Koa.Context) {
    if (ctx.headers["x-goog-resource-state"]) {
        return sendGapi(ctx);
    }

    logger.warn("No resource state provided with push attempt", {headers: ctx.headers});
}

export async function dm(ctx: Koa.Context) {
    const sessionId = ctx.headers.Authorization;
    if (!sessionId) {
        throw new AuthError();
    }

    const event = requireKey(ctx.request, "body");

    await push.sendDmEvent(sessionId, event);
    ctx.status = 201;
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
    const token: string = requireKey(ctx.headers, "x-goog-channel-token");

    await push.notifyChanged(channel, token);
    ctx.status = 201;
}
