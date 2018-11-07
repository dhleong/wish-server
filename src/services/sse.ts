import { MemoryBus } from "darkside-sse";
import { IDarksideBus } from "darkside-sse";
import { IEvent } from "lightside";

import config from "../config";
import { selectRandomIndex, slice } from "../util/collections";
import { EventId, IChannelServiceImpl } from "./channels";

export interface ISSEService extends IChannelServiceImpl {
    bus: IDarksideBus;
}

/**
 * Special subclass of MemoryBus with extra filtering logic
 * for need-watch event. In order to prevent a self-DDOS,
 * we only *select* a subset of listeners on the channel.
 */
export class SelectiveMemoryBus extends MemoryBus {

    constructor(
        private maxNeedWatch: number = config.maxNeedWatchPer,
        private chooseMember: (slice: any[]) => number = selectRandomIndex,
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

export class SSEService implements ISSEService {
    constructor(
        public readonly bus: IDarksideBus = new SelectiveMemoryBus(),
    ) { }

    public send(sessionId: string, eventName: string, eventData: any) {
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
