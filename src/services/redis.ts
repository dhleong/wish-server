import { createHash } from "crypto";
import { createHandyClient, IHandyRedis } from "handy-redis";
import * as redis from "redis";

import { logger } from "../log";

let client: IHandyRedis;

export function getClient() {
    if (!client) client = createClient();
    return client;
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

export function swapClient(newRedis: IHandyRedis) {
    const old = client;
    client = newRedis;
    return old;
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
