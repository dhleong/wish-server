import { MemoryBus } from "darkside-sse";
import { IHandyRedis } from "handy-redis";
import { IEvent, ServerSideEvents } from "lightside";

import services from "../src/services";
import * as redis from "../src/services/redis";
import { SSEService } from "../src/services/sse";
import { ITokenPayload, ITokenService } from "../src/services/token";

class TestableBus extends MemoryBus {

    public sent: {[channelId: string]: any[]} = {};

    public send(channel: string, event: string | Buffer | IEvent): boolean {
        if (!this.sent[channel]) {
            this.sent[channel] = [];
        }

        this.sent[channel].push(event);

        return true;
    }
}

class FakeTokenService implements ITokenService {
    public generate(fileId: string): string {
        return fileId;
    }

    public unpack(token: string): ITokenPayload {
        return {
            fileId: token,
        };
    }
}

export function integrate(testFn: (redis: IHandyRedis, bus: TestableBus) => Promise<any>): () => Promise<any> {
    return async () => {
        // stub out services
        const bus = new TestableBus();
        services.sse = new SSEService(bus);

        services.token = new FakeTokenService();

        await redis.client.flushdb();

        try {
            await testFn(redis.client, bus);

        } finally {
            // let our node process finish:
            redis.client.redis.unref();
        }
    };
}
