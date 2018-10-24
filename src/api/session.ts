import * as Koa from "koa";

import { InputError, requireKey } from "../errors";
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

export async function create(ctx: Koa.Context): Promise<string[]> {
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
        ctx.events,
        params.auth,
        params.ids,
    );

    // return the SSE channels we should subscribe to
    return [sessionId].concat(params.ids);
}
