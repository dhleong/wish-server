import * as Koa from "koa";

import * as push from "../services/push";

export async function register(ctx: Koa.Context) {
    await push.register(ctx.request.body);
    ctx.status = 201; // "created"
}

export async function send(ctx: Koa.Context) {
    await push.send(ctx.request.body);
}
