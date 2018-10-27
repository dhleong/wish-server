import { RedisBus } from "darkside-sse";
import { IDarksideBus } from "darkside-sse";
import { ServerSideEvents } from "lightside";
import { RedisClient } from "redis";

import * as redis from "./redis";

export interface ISSEService {
    bus: IDarksideBus;

    addToChannel(channelId: string | string[], client: ServerSideEvents): void;

    sendChanged(sessionId: string, sheetId: string): void;
    sendNeedWatch(sessionId: string, sheetId: string): void;
    sendSessionCreated(sessionId: string): void;
}

function dup(client: RedisClient): RedisClient {
    const c = client.duplicate();

    // we don't need this client to keep the server alive,
    // so unref to ensure tests can exit cleanly
    c.unref();

    return c;
}

export class SSEService implements ISSEService {
    constructor(
        public readonly bus: IDarksideBus = new RedisBus(
            redis.client.redis,
            dup(redis.client.redis),
        ),
    ) {}

    public addToChannel(channelId: string | string[], client: ServerSideEvents) {
        this.bus.register(channelId, client);
    }

    public sendChanged(sessionId: string, sheetId: string) {
        this.send(sessionId, "changed", {
            id: sheetId,
        });
    }

    public sendNeedWatch(sessionId: string, sheetId: string) {
        this.send(sessionId, "need-watch", {
            id: sheetId,
        });
    }

    public sendSessionCreated(sessionId: string) {
        this.send(sessionId, "session-created", {
            id: sessionId,
        });
    }

    protected send(sessionId: string, eventName: string, eventData: any) {
        this.bus.send(sessionId, {
            data: JSON.stringify({
                data: eventData,
                event: eventName,
            }),
        });
    }
}
