import { RedisClient } from "redis";

import services from "../services";
import * as redis from "./redis";

export enum EventId {
    Changed = "changed",
    NeedWatch = "need-watch",
}

export interface IChannelsService {
    sendChanged(sessionId: string, sheetId: string): void;

    // tslint:disable-next-line:unified-signatures since the param moves
    sendNeedWatch(sessionId: string, sheetId?: string): void;
    sendNeedWatch(sheetId: string): void;
}

export interface IChannelServiceImpl {
    send(channelId: string, event: EventId, data: any): void;
}

const distributedEventChannel = "wish-event";

/**
 * DistributedChannelsService delegates to SSE and SIO services locally,
 * and distributes events across server processes via Redis.
 */
export class DistributedChannelsService implements IChannelsService {

    constructor(
        private readonly pub: RedisClient = redis.getClient().redis,
        sub: RedisClient = redis.getPubsub(),
    ) {
        // hacks for simpler test impl:
        if (sub) {
            sub.subscribe(distributedEventChannel);
            sub.on("message", (channel, eventRaw) => {
                if (channel !== distributedEventChannel) return;

                const { channelId, event, data } = JSON.parse(eventRaw);

                this.distributeLocal(channelId, event as EventId, data);
            });
        }
    }

    public sendChanged(sessionId: string, sheetId: string): void {
        this.send(sessionId, EventId.Changed, {
            id: sheetId,
        });
    }

    public sendNeedWatch(sheetId: string): void;
    public sendNeedWatch(sessionId: string, sheetId?: string | undefined): void {
        const actualSheetId = sheetId
            ? sheetId
            : sessionId;
        this.send(sessionId, EventId.NeedWatch, {
            id: actualSheetId,
        });
    }

    /** NOTE: this is protected for easy implementation in test-integration */
    protected send(channelId: string, event: EventId, data: any): void {
        this.pub.publish(distributedEventChannel, JSON.stringify({
            channelId,
            data,
            event,
        }));
    }

    private distributeLocal(channelId: string, event: EventId, data: any): void {
        for (const serviceId of Object.keys(services.channelTypes)) {
            const svc = (services.channelTypes as any)[
                serviceId
            ] as IChannelServiceImpl;
            svc.send(channelId, event, data);
        }
    }

}
