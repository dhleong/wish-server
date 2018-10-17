import Router from "koa-router";

import * as push from "./api/push";

export function createRoutes() {
    const routes = new Router();

    routes.get("/push/vapid", push.getVapidPublicKey);
    routes.post("/push/register", push.register);
    routes.post("/push/send", push.send);
    routes.delete("/push/c/:channelId", push.deleteChannel);

    return routes;
}
