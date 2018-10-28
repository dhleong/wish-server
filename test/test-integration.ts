import { MemoryBus } from "darkside-sse";
import { IHandyRedis } from "handy-redis";
import { IEvent } from "lightside";

import services from "../src/services";
import { AuthService } from "../src/services/auth";
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
            sheetId: token,
        };
    }
}

export class FakeProvider implements IProvider<any> {

    public validateRequests: any[] = [];

    public async watch(config: IWatchParams<any>, channelId: string, isNewChannel: boolean): Promise<any> {
        // nop
    }
    public async unwatch(config: IWatchParams<any>, channelId: string): Promise<any> {
        // nop
    }
    public async validate(auth: any): Promise<any> {
        this.validateRequests.push(auth);
    }
}

class FakeProviderService implements IProviderService {

    public readonly knownProviders: string[] = ["fake"];

    private readonly inst = new FakeProvider();

    public byId(providerId: string): IProvider<any> {
        return this.inst;
    }

    public forSheet(sheetId: string): IProvider<any> {
        return this.byId(sheetId);
    }
}

export interface ITestFnInputs {
    provider: FakeProviderService;
    redis: IHandyRedis;
    bus: TestableBus;
}

export function integrate(testFn: (args: ITestFnInputs) => Promise<any>): () => Promise<any> {
    return async () => {
        // stub out services
        const bus = new TestableBus();
        services.auth = new AuthService();
        services.sse = new SSEService(bus);

        services.provider = new FakeProviderService();
        services.token = new FakeTokenService();

        await redis.client.flushdb();

        try {
            await testFn({
                bus,
                provider: services.provider as FakeProviderService,
                redis: redis.client,
            });

        } finally {
            // let our node process finish:
            redis.client.redis.unref();
        }
    };
}
