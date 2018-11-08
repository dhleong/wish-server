import { EventEmitter } from "events";
import { Server } from "http";
import * as url from "url";

import { Adapter as IAdapter, default as SocketIO } from "socket.io";
// import { default as BaseAdapter } from "socket.io-adapter";

import config from "../config";
import { logger } from "../log";
import { selectRandomIndex } from "../util/collections";
import { EventId, IChannelServiceImpl } from "./channels";
import * as session from "./session";

// NOTE: typescript loses its mind if we try to import this:
// tslint:disable-next-line
const BaseAdapter = require("socket.io-adapter");

export const SOCKET_PATH = "/v1/push/sessions/io";

/**
 * Convert a sane CORS_HOST value (eg: `http://dhleong.github.io`)
 * to something that makes socket.io happy (eg: `http://dhleong.github.io:443`)
 * NOTE: public for TESTING
 */
export function convertCorsHost(host: string | undefined) {
    if (!host) return;
    const { protocol, hostname, port: rawPort } = url.parse(host);
    const port = rawPort ? rawPort :
        (protocol === "https:" ? 443 : 80);
    return `${protocol}//${hostname}:${port}`;
}

interface IBroadcastOpts {
    rooms?: string[];
    except?: string[];
    flags?: {[flag: string]: boolean};
}

/**
 * Custom adapter to limit potential audience of need-watch
 */
export class SelectiveSIOAdapter extends EventEmitter implements IAdapter {
    private base: IAdapter;

    constructor(
        public nsp: SocketIO.Namespace,
        private maxNeedWatch: number = config.maxNeedWatchPer,
        private chooseMember: (slice: any[]) => number = selectRandomIndex,
    ) {
        super();
        this.base = new BaseAdapter(nsp);
    }

    public get rooms(): SocketIO.Rooms {
        return this.base.rooms;
    }
    public get sids(): { [id: string]: { [room: string]: boolean; }; } {
        return this.base.sids;
    }

    public add(id: string, room: string, callback?: ((err?: any) => void) | undefined): void {
        this.base.add(id, room, callback);
    }
    public addAll(id: string, rooms: string[], callback?: ((err?: any) => void) | undefined): void {
        // sigh:
        (this.base as any).addAll(id, rooms, callback);
    }

    public del(id: string, room: string, callback?: ((err?: any) => void) | undefined): void {
        this.base.del(id, room, callback);
    }
    public delAll(id: string): void {
        this.base.delAll(id);
    }

    public broadcast(
        packet: any,
        opts: IBroadcastOpts,
    ) {
        if (
            packet.type === 2
            && Array.isArray(packet.data)
            && packet.data.length >= 2
            && packet.data[1].event === EventId.NeedWatch
        ) {
            this.filteredBroadcast(packet, opts);
            return;
        }
        this.base.broadcast(packet, opts);
    }

    private filteredBroadcast(packet: any, opts: IBroadcastOpts) {
        // filtered broadcast, based loosely on original Adapter.broadcast
        // for "secret" methods

        const targetRooms = opts.rooms;
        if (!targetRooms) {
            // this will never happen; we *only* send to rooms (channels)
            throw new Error("No rooms for filtered broadcast?");
        } else if (targetRooms.length !== 1) {
            // also will never happen; we *only* send filtered
            // broadcasts to a single room (channel) at a time
            // this guarantee means we don't have to de-dup sends
            // against each client, and simplifies some logic
            throw new Error(`Expected 1 target room; got ${targetRooms.length}`);
        }

        const flags = opts.flags || {};
        const packetOpts = {
            preEncoded: true,

            compress: flags.compress,
            volatile: flags.volatile,
        };

        packet.nsp = this.nsp.name;
        (this.base as any).encoder.encode(packet, (encodedPackets: any) => {
            const roomId = targetRooms[0];
            const room = this.rooms[roomId];
            if (!room) return; // we don't have this room locally

            const allSockets = Object.keys(room.sockets)
                .map(sid => this.nsp.connected[sid])
                .filter(s => s);

            // See see.ts
            const choices = allSockets.slice(0, 20 * this.maxNeedWatch);
            for (let i = 0; i < this.maxNeedWatch; ++i) {
                const r = this.chooseMember(choices);
                const [ socket ] = choices.splice(r, 1);

                // NOTE: SocketIO.Adapter uses this secret method:
                (socket as any).packet(encodedPackets, packetOpts);
            }
        });
    }
}

export class SocketIoService implements IChannelServiceImpl {

    private io: SocketIO.Server;
    private ns: SocketIO.Namespace;

    constructor(
        server: Server | number,
        corsHost: string | undefined,
        adapterConstructor: new (nsp: SocketIO.Namespace) => IAdapter,

        // dependency injection, sort of:
        sessionConnect: typeof session.connect = session.connect,
        sessionDestroy: typeof session.destroy = session.destroy,
    ) {
        const factory = adapterConstructor || SelectiveSIOAdapter;
        this.io = SocketIO(server as any, {
            // NOTE: the SocketIO typings suck, but this is what they want:
            adapter: factory as any as IAdapter,
            origins: convertCorsHost(corsHost) || "*:*",
            path: SOCKET_PATH,
            serveClient: false,
        });

        this.ns = this.io.of(/\/[a-zA-Z0-9-]+/);
        this.ns.use(async (conn, next) => {
            try {
                const sessionId = conn.nsp.name.substring(1);

                const {
                    channels,
                    interestedIds,
                } = await sessionConnect(sessionId);

                conn.join(channels);

                conn.on("disconnect", async () => {
                    try {
                        await sessionDestroy(sessionId, interestedIds);
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

    /**
     * Shutdown this service
     */
    public close() {
        this.io.close();
    }

    public send(channelId: string, event: EventId, data: any) {
        this.ns.to(channelId).send({
            data,
            event,
        });
    }
}
