import uuid from "uuid/v4";
import * as webPush from "web-push";

import { InputError, requireInput, requireKey } from "../errors";
import { logger } from "../log";
import services from "../services";
import { IChannelContext, IChannelInfo, IPushService, IWatchParams } from "./push/core";
import { GapiPushService } from "./push/gapi";
import * as redis from "./redis";

export { IChannelInfo, IWatchParams } from "./push/core";

const pushServices: {[kind: string]: IPushService<any>} = {
    gdrive: GapiPushService,
};

/**
 * Initialize the service
 */
export async function init() {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        // tslint:disable-next-line
        console.log(
            "You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY " +
            "environment variables. You can use the following ones:",
            webPush.generateVAPIDKeys(),
        );
        return;
    }

    webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || "https://dhleong.github.io/wish",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
    );
}

export function getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY;
}

export async function deleteChannel(
    channelId: string,
    auth: any,
) {
    const ch = await getChannel(channelId);
    if (!ch) return; // nothing to do

    const service = pushServices[ch.context.kind];
    if (!service) {
        throw new InputError(`Unknown service: ${ch.context.kind}`);
    }

    const userId = ch.userId;

    await service.unwatch({
        auth,
        context: ch.context,
        userId,
    }, channelId);

    await redis.client.del(
        `channel:${channelId}`,
        `channelForUser:${userId}`,
    );
}

/**
 * Register a web-push receiver
 */
export async function register(body: IWatchParams<any>) {
    const service = pushServices[body.context.kind];
    if (!service) {
        throw new InputError(`Unknown service: ${body.context.kind}`);
    }

    // TODO fall back to websockets or something
    const sub = requireKey(body, "subscription");

    const [ channelId, isNew ] = await prepareChannel(body.userId, body.context, sub);

    // create the watch, if necessary
    const watchResult = await service.watch(body, channelId, isNew);

    logger.info("registered channel", { channelId });
    return {
        channelId,
    };
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

    const ch = await getChannel(channel);
    if (!ch || !ch.subscription) {
        // TODO should we record the userId and channel pair,
        // so if the user later register()s we can destroy
        // the old watch?
        logger.warn("Received push to stale subscription", {channel, userId});
        throw new InputError("No such channel");
    }

    const payload = JSON.stringify(ch.context);

    const options = {
        TTL: 10 * 60, // in seconds
    };

    return webPush.sendNotification(ch.subscription, payload, options);
}

/**
 * Resolves to `[channelId, isNewChannel]`
 */
async function prepareChannel(
    userId: string,
    context: IChannelContext,
    subscription: webPush.PushSubscription,
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
            subscription,
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
