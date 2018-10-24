import uuid from "uuid/v4";

import { InputError, requireInput, requireKey } from "../errors";
import { logger } from "../log";
import services from "../services";
import { IChannelContext, IChannelInfo, IPushService, IWatchParams } from "./push/core";
import * as redis from "./redis";

export { IChannelInfo, IWatchParams } from "./push/core";

/**
 * Initialize the service
 */
export async function init() {
    // nop
}

/**
 * Webhook receiver for "changed" notifications from a Provider
 */
export async function send(channel: string, token: string) {
    logger.info("SEND", {channel, token});

    requireInput(channel, "channel");
    requireInput(token, "token");

    // unpack() verifies the validity of the token
    // and throws an exception if it's not legit
    const {
        sheetId,
    } = services.token.unpack(token);

    // NOTE: anyone interested in this sheet is listening
    // on a channel named by the sheetId
    services.sse.sendChanged(sheetId, sheetId);
}

/**
 * Resolves to `[channelId, isNewChannel]`
 */
async function prepareChannel(
    userId: string,
    context: IChannelContext,
): Promise<[string, boolean]> {

    const channelForUserKey = `channelForUser:${userId}`;
    const existingUserChannel = await redis.GET(channelForUserKey);

    const channelId = existingUserChannel
        ? existingUserChannel
        : uuid();

    // ttl in seconds: 8 hours
    const ttls = 8 * 3600;

    await redis.multi(m => {
        // always update the subscription
        m.setex(`channel:${channelId}`, ttls, JSON.stringify({
            context,
            userId,
        }));

        // also go ahead and update the user->channel mapping
        // to reset the ttl
        m.setex(channelForUserKey, ttls, channelId);
    });

    return [channelId, !existingUserChannel];
}

async function getChannel(channelId: string): Promise<IChannelInfo | undefined> {
    const json = await redis.GET(`channel:${channelId}`);
    if (!json) return;
    return JSON.parse(json);
}
