import { MemoryBus, RedisBus } from "darkside-sse";
import { IDarksideBus } from "darkside-sse";
import { IEvent } from "lightside";

import config from "../config";
import { BaseChannelsService, EventId, IChannelsService } from "./channels";
import * as redis from "./redis";

export interface ISSEService extends IChannelsService {
    bus: IDarksideBus;
}

/**
 * Take a subset of the given set as an Array.
 * @return Array of length [count], or `set.size`,
 *  whichever is smaller.
 */
function slice<T>(set: Set<T>, count: number): T[] {
    // NOTE: some brief benchmarks suggested that
    // Array.from is quite slow, so we always iterate,
    // even if we're taking the whole array
    const result: T[] = [];
    const len = set.size;
    const end = Math.min(len, count);

    let i = 0;
    for (const member of set) {
        result.push(member);
        if (++i >= end) break;
    }

    return result;
}

function selectRandom(choices: any[]): number {
    return Math.floor(Math.random() * choices.length);
}

/**
 * Special subclass of MemoryBus with extra filtering logic
 * for need-watch event. In order to prevent a self-DDOS,
 * we only *select* a subset of listeners on the channel.
 */
export class SelectiveMemoryBus extends MemoryBus {

    constructor(
        private maxNeedWatch: number = config.maxNeedWatchPer,
        private chooseMember: (slice: any[]) => number = selectRandom,
    ) {
        super();
    }

    public send(
        channelId: string,
        event: IEvent | string | Buffer,
    ): boolean {
        if ((event as IEvent).comment !== "need-watch") {
            return super.send(channelId, event);
        }

        // this is a need-watch event
        delete (event as IEvent).comment;

        const ch = this.channels[channelId];
        if (ch.size <= this.maxNeedWatch) {
            // if there aren't that many, just ask 'em all
            return super.send(channelId, event);
        }

        // pick N random members
        // since this could get quite large, we just take
        // a subset of the members, and pick randomly among them.
        const choices = slice(ch.getMembers(), 20 * this.maxNeedWatch);
        for (let i = 0; i < this.maxNeedWatch; ++i) {
            const r = this.chooseMember(choices);
            const [ choice ] = choices.splice(r, 1);
            choice.send(event);
        }

        return true;
    }
}

export class SSEService extends BaseChannelsService implements ISSEService {
    constructor(
        public readonly bus: IDarksideBus = new RedisBus(
            redis.getClient().redis,
            redis.getPubsub(),
        ),
    ) {
        super();
    }

    protected send(sessionId: string, eventName: string, eventData: any) {
        this.bus.send(sessionId, {
            comment: eventName === EventId.NeedWatch
                ? EventId.NeedWatch
                : undefined,
            data: JSON.stringify({
                data: eventData,
                event: eventName,
            }),
        });
    }
}
