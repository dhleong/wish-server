import Router from "koa-router";

import { darkside } from "darkside-sse";
import { lightside } from "lightside";

import * as push from "./api/push";
import services from "./services";

export function createRoutes() {
    const routes = new Router();

    routes.get("/push/vapid", push.getVapidPublicKey);
    routes.post("/push/register", push.register);
    routes.post("/push/send", push.send);
    routes.delete("/push/c/:channelId", push.deleteChannel);

    routes.get("/push/c/:channelId",
        lightside(),
        darkside({
            bus: services.sse.bus,
            extractChannelIds: ctx => ctx.params.channelId,
        }),
    );

    return routes;
}
