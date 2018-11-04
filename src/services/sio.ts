import { Server } from "http";
import { default as SocketIO } from "socket.io";

import { logger } from "../log";
import { EventId, IChannelServiceImpl } from "./channels";
import * as session from "./session";

export class SocketIoService implements IChannelServiceImpl {

    private io: SocketIO.Server;
    private ns: SocketIO.Namespace;

    constructor(server: Server, corsHost: string | undefined) {
        this.io = SocketIO(server, {
            // TODO custom adapter to limit potential audience of need-watch
            // adapter: null,
            origins: corsHost || "*:*",
            path: "/v1/push/sessions/io",
            serveClient: false,
        });

        this.ns = this.io.of(/\/[a-zA-Z0-9-]+/);
        this.ns.use(async (conn, next) => {
            try {
                const sessionId = conn.nsp.name.substring(1);

                const {
                    channels,
                    interestedIds,
                } = await session.connect(sessionId);

                conn.join(channels);

                conn.on("disconnect", async () => {
                    try {
                        await session.destroy(sessionId, interestedIds);
                    } catch (e) {
                        logger.warn(`Error destroying session ${sessionId}`, {error: e});
                    }
                });

                next();
            } catch (e) {
                next(e);
            }
        });
    }

    public send(channelId: string, event: EventId, data: any) {
        this.ns.to(channelId).send({
            data,
            event,
        });
    }
}
