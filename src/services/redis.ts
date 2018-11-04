import { createHash } from "crypto";
import { createHandyClient, IHandyRedis } from "handy-redis";
import * as redis from "redis";

import { logger } from "../log";
import services from "../services";

let client: IHandyRedis;
let pubsub: redis.RedisClient;

export function getClient() {
    if (!client) client = createClient();
    return client;
}

export function getPubsub() {
    if (!pubsub) pubsub = createPubsub(getClient());
    return pubsub;
}

/** NOTE: This should ONLY be used in tests */
export function swapClient(
    newRedis: IHandyRedis,
    newPubsub?: redis.RedisClient,
): [IHandyRedis, redis.RedisClient] {
    const oldClient = client;
    const oldPubsub = pubsub;
    client = newRedis;
    if (newPubsub || !newRedis) {
        pubsub = newPubsub as any; // shh
    } else {
        pubsub = createPubsub(newRedis);
    }
    return [oldClient, oldPubsub];
}

function createClient() {
    const endpoint = process.env.REDIS_ENDPOINT;
    const password = process.env.REDIS_PASSWORD;

    const handy = endpoint
        ? createHandyClient(`//${endpoint}`, {
            password,
        })
        : createHandyClient(); // local redis

    handy.redis.on("error", e => {
        logger.warn("Redis error", {error: e});
    });

    return handy;
}

function createPubsub(base: IHandyRedis) {
    const c = base.redis.duplicate();

    // we don't need this client to keep the server alive,
    // so unref to ensure tests can exit cleanly
    c.unref();

    c.on("error", e => {
        logger.warn("Pubsub Redis Client error", {error: e});
    });

    const watcherExpiryEvent = "__keyspace@*__:watcher:*";

    c.config("set", "notify-keyspace-events", "Kx");
    c.psubscribe(watcherExpiryEvent);

    c.on("pmessage", (pattern, key, event) => {
        if (pattern !== watcherExpiryEvent) return;

        const watcherIdx = key.indexOf("watcher:");
        const sheetId = key.substring(watcherIdx + "watcher:".length);

        logger.info(`needWatch for ${sheetId}`);
        services.channels.sendNeedWatch(sheetId);
    });

    return c;
}

export async function init() {
    // verify connection
    const pong = await getClient().ping("pong");
    if (pong !== "pong") {
        throw new Error("Unable to verify Redis connection");
    }
}

export async function multi(block: (m: redis.Multi) => any) {
    const cli = getClient();
    const m = cli.multi();
    block(m);
    return await cli.execMulti(m);
}

/**
 * Convenient abstraction over LUA scripts that prefers EXECSHA
 */
export class Script<Args extends any[] = string[]> {
    private sha: string;

    constructor(
        private lua: string,
    ) {
        const sha1 = createHash("sha1");
        sha1.update(lua);
        this.sha = sha1.digest("hex");
    }

    /**
     * Eval the script with the given `keys` and `args`. Since `keys` is a list,
     * `numkeys` is computed for you
     */
    public async eval(keys: string[], args?: Args): Promise<any> {
        const cli = getClient();
        const actualArgs = args
            ? args.map(it => it.toString())
            : [];
        try {
            return await cli.evalsha(this.sha, keys.length, keys, actualArgs);
        } catch (e) {
            return cli.eval(this.lua, keys.length, keys, actualArgs);
        }
    }
}
