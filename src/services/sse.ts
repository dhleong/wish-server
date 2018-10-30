import { RedisBus } from "darkside-sse";
import { IDarksideBus } from "darkside-sse";
import { ServerSideEvents } from "lightside";

import * as redis from "./redis";

export interface ISSEService {
    bus: IDarksideBus;

    addToChannel(channelId: string | string[], client: ServerSideEvents): void;

    sendChanged(sessionId: string, sheetId: string): void;
    // tslint:disable-next-line:unified-signatures since the param moves
    sendNeedWatch(sessionId: string, sheetId?: string): void;
    sendNeedWatch(sheetId: string): void;
    sendSessionCreated(sessionId: string): void;
}

export class SSEService implements ISSEService {
    constructor(
        public readonly bus: IDarksideBus = new RedisBus(
            redis.getClient().redis,
            redis.getPubsub(),
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

    public sendNeedWatch(sheetId: string): void;
    public sendNeedWatch(sessionId: string, sheetId?: string) {
        const actualSheetId = sheetId
            ? sheetId
            : sessionId;
        this.send(sessionId, "need-watch", {
            id: actualSheetId,
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
