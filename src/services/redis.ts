import { createHandyClient } from "handy-redis";
import * as redis from "redis";
import { requireKey } from "../errors";

export const client = createClient();

function createClient() {
    const endpoint: string = requireKey(process.env, "REDIS_ENDPOINT");
    const password = requireKey(process.env, "REDIS_PASSWORD");

    return createHandyClient(`//${endpoint}`, {
        password,
    });
}

export async function init() {
    // verify connection
    const pong = await GET("ping");
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
