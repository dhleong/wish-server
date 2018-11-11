import Router from "koa-router";

import { darkside } from "darkside-sse";
import { lightside } from "lightside";

import * as push from "./api/push";
import * as session from "./api/session";
import services from "./services";

export function createRoutes() {
    const routes = new Router();

    routes.post("/push/send", push.send);
    routes.post("/push/sessions/dm", push.dm);

    routes.post("/push/sessions", session.create);
    routes.get("/push/sessions/sse/:sessionId",
        lightside(),
        darkside({
            bus: services.channelTypes.sse.bus,
            extractChannelIds: session.connect,
        }),
    );

    // NOTE: socket.io is on /push/sessions/io/:sessionId,
    // but can't be initialized here because it *needs*
    // to attach directly to the server :\

    routes.post("/push/sessions/watch", session.addWatch);

    return routes;
}
