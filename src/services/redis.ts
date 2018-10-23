import { createHash } from "crypto";
import { createHandyClient } from "handy-redis";
import * as redis from "redis";

import { requireKey } from "../errors";
import { logger } from "../log";

export const client = createClient();

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

export async function init() {
    // verify connection
    const pong = await client.ping("pong");
    if (pong !== "pong") {
        throw new Error("Unable to verify Redis connection");
    }
}

export const GET = client.get;
export const HGET = client.hget;

export async function multi(block: (m: redis.Multi) => any) {
    const m = client.multi();
    block(m);
    return await client.execMulti(m);
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
        const actualArgs = args
            ? args.map(it => it.toString())
            : [];
        try {
            return await client.evalsha(this.sha, keys.length, keys, actualArgs);
        } catch (e) {
            return client.eval(this.lua, keys.length, keys, actualArgs);
        }
    }
}
