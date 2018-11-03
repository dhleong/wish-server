import * as Koa from "koa";

import { InputError, requireKey } from "../errors";
import { logger } from "../log";
import { IAuth } from "../services/auth";
import * as session from "../services/session";
import * as watch from "../services/watch";

export async function addWatch(ctx: Koa.Context) {
    if (!ctx.request.body) {
        throw new InputError();
    }

    const params = ctx.request.body as {
        sessionId: string,
        auth: IAuth,
        ids: string[],
    };
    requireKey(params, "sessionId");
    requireKey(params, "auth");
    requireKey(params, "ids");

    await watch.create(params.sessionId, params.auth, params.ids);

    ctx.status = 201; // "created"
}

export async function connect(ctx: Koa.Context): Promise<string[]> {
    const { sessionId } = ctx.params;

    const {
        channels,
        interestedIds,
    } = await session.connect(sessionId);

    // handle client disconnect
    ctx.events.once("close", async () => {
        try {
            await session.destroy(sessionId, interestedIds);
        } catch (e) {
            logger.warn(`Error destroying session ${sessionId}`, {error: e});
        }
    });

    return channels;
}

export async function create(ctx: Koa.Context): Promise<void> {
    if (!ctx.request.body) {
        throw new InputError();
    }

    const params = ctx.request.body as {
        auth: IAuth,
        ids: string[],
    };
    requireKey(params, "auth");
    requireKey(params, "ids");

    const sessionId = await session.create(
        params.auth,
        params.ids,
    );

    // return the session ID so they can subscribe later
    ctx.body = {id: sessionId};
}
