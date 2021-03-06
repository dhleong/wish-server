import { createHandyClient, IHandyRedis } from "handy-redis";

import { InputError } from "../src/errors";
import services from "../src/services";
import { AuthService } from "../src/services/auth";
import { DistributedChannelsService, EventId } from "../src/services/channels";
import { IProviderService } from "../src/services/provider";
import { IProvider, IWatchParams } from "../src/services/provider/core";
import * as redis from "../src/services/redis";
import { ITokenPayload, ITokenService } from "../src/services/token";

class FakeChannelsService extends DistributedChannelsService {
    public sent: {[channelId: string]: any[]} = {};

    constructor() {
        super(null as any, null as any); // HACKS!
    }

    protected send(channel: string, event: EventId, data: any): void {
        if (!this.sent[channel]) {
            this.sent[channel] = [];
        }

        this.sent[channel].push({ event, data });
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
    public editableFiles = new Set<string>();

    public async watch(config: IWatchParams<any>, channelId: string, ttlSeconds: number): Promise<any> {
        // nop
    }
    public async unwatch(config: IWatchParams<any>, channelId: string): Promise<any> {
        // nop
    }
    public async validate(auth: any): Promise<any> {
        this.validateRequests.push(auth);
    }
    public async verifyCanEdit(auth: any, fileId: string): Promise<any> {
        if (!this.editableFiles.has(fileId)) {
            throw new InputError(`Not authorized: ${fileId}`);
        }
    }
}

class FakeProviderService implements IProviderService {

    public readonly knownProviders: string[] = ["fake"];

    public readonly inst = new FakeProvider();

    public byId(providerId: string): IProvider<any> {
        return this.inst;
    }

    public forSheet(sheetId: string): IProvider<any> {
        return this.byId(sheetId);
    }
}

export interface ITestFnInputs {
    channels: FakeChannelsService;
    provider: FakeProviderService;
    redis: IHandyRedis;
}

export function integrate(testFn: (args: ITestFnInputs) => Promise<any>): () => Promise<any> {
    return async () => {
        // stub out services
        services.auth = new AuthService();
        services.channels = new FakeChannelsService();

        services.provider = new FakeProviderService();
        services.token = new FakeTokenService();

        // create a temporary redis client, to ensure we're
        // running tests locally
        const tempRedis = createHandyClient();
        const [oldRedis, oldPubsub] = redis.swapClient(tempRedis);

        await tempRedis.flushdb();

        try {
            await testFn({
                channels: services.channels as FakeChannelsService,
                provider: services.provider as FakeProviderService,
                redis: tempRedis,
            });

        } finally {
            // let our node process finish:
            tempRedis.redis.unref();
            redis.getPubsub().quit();

            // restore any existing client
            redis.swapClient(oldRedis, oldPubsub);
        }
    };
}
