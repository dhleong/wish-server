import { Server } from "http";
import { default as SocketIO } from "socket.io";
import { default as redisAdapter } from "socket.io-redis";

import { logger } from "../log";
import { BaseChannelsService, EventId, IChannelsService } from "./channels";
import * as redis from "./redis";
import * as session from "./session";

export type ISocketIoService = IChannelsService;

export class SocketIoService extends BaseChannelsService implements ISocketIoService {

    private io: SocketIO.Server;
    private ns: SocketIO.Namespace;

    constructor(server: Server, corsHost: string | undefined) {
        super();

        this.io = SocketIO(server, {
            adapter: redisAdapter({
                pubClient: redis.getClient().redis,
                subClient: redis.getPubsub(),
            }),
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

    protected send(sessionId: string, event: EventId, data: any) {
        this.ns.to(sessionId).send({
            data,
            event,
        });
    }
}
