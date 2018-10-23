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

export async function deleteChannel(
    channelId: string,
    auth: any,
) {
    // TODO
}

/**
 * Webhook receiver for web-push
 */
export async function send(channel: string, userId: string, body: any) {
    logger.info("SEND", {channel, userId});

    requireInput(channel, "channel");
    requireInput(userId, "userId");

    // TODO can we (should we?) get the file id watched?
    services.sse.sendChanged(channel, channel); // FIXME ?
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
