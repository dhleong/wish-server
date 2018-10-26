import Router from "koa-router";

import { darkside } from "darkside-sse";
import { lightside } from "lightside";

import * as push from "./api/push";
import * as session from "./api/session";
import services from "./services";

export function createRoutes() {
    const routes = new Router();

    routes.post("/push/send", push.send);

    routes.post("/push/sessions", session.create);
    routes.get("/push/sessions/:sessionId",
        lightside(),
        darkside({
            bus: services.sse.bus,
            extractChannelIds: session.connect,
        }),
    );

    routes.post("/push/sessions/watch", session.addWatch);

    return routes;
}
