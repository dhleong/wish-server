import { MemoryBus } from "darkside-sse";
import { IHandyRedis } from "handy-redis";
import { IEvent, ServerSideEvents } from "lightside";

import services from "../src/services";
import { IProviderService } from "../src/services/provider";
import { IProvider, IWatchParams } from "../src/services/provider/core";
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

class FakeProvider implements IProvider<any> {
    public async watch(config: IWatchParams<any>, channelId: string, isNewChannel: boolean): Promise<any> {
        // nop
    }
    public async unwatch(config: IWatchParams<any>, channelId: string): Promise<any> {
        // nop
    }
    public async validate(auth: any): Promise<any> {
        // nop
    }
}

class FakeProviderService implements IProviderService {
    public byId(providerId: string): IProvider<any> {
        return new FakeProvider();
    }

    public forSheet(sheetId: string): IProvider<any> {
        return this.byId(sheetId);
    }
}

export function integrate(testFn: (redis: IHandyRedis, bus: TestableBus) => Promise<any>): () => Promise<any> {
    return async () => {
        // stub out services
        const bus = new TestableBus();
        services.sse = new SSEService(bus);

        services.provider = new FakeProviderService();
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
