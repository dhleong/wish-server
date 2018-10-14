import Router from "koa-router";

import * as push from "./api/push";

export function createRoutes() {
    const routes = new Router();

    routes.post("/push/register", push.register);
    routes.post("/push/send", push.send);

    return routes;
}
