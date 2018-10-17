/*
 * GAPI implementation of Push service
 */

import { drive_v3, google } from "googleapis";

import * as redis from "../redis";
import { IPushService, IWatchParams } from "./core";

const DEFAULT_PUSH_URL = "https://wish-server.now.sh/v1/push/send";

export interface IGapiOauth {
    access_token: string;
    token_type: string;
}

function auth(token: IGapiOauth) {
    const oauth = new google.auth.OAuth2();
    oauth.setCredentials(token);
    return oauth;
}

function channelToken(config: IWatchParams<IGapiOauth>) {
    // NOTE the library may convert this to a number if
    // we pass the user id directly. Sigh.
    return JSON.stringify({userId: config.userId});
}

class GapiPushServiceImpl implements IPushService<IGapiOauth> {

    private api = new drive_v3.Drive({});

    public async watch(
        config: IWatchParams<IGapiOauth>,
        channelId: string,
        isNewChannel: boolean,
    ) {

        if (!isNewChannel) {
            // try to delete the old channel and refresh the watch
            await this.unwatch(config, channelId);
        }

        // 4 hours:
        const watchDurationMillis = 4 * 60 * 60000;

        const result = await this.api.files.watch({
            auth: auth(config.auth),
            fileId: config.context.id,
            requestBody: {
                address: process.env.GAPI_PUSH_URL || DEFAULT_PUSH_URL,
                expiration: "" + (Date.now() + watchDurationMillis),
                id: channelId,
                token: channelToken(config),
                type: "web_hook",
            },
        });

        if (result.data.resourceId) {
            // save this in case we later want to delete it early
            await redis.client.setex(`gapi:${channelId}:res`, watchDurationMillis / 1000, result.data.resourceId);
        }

        return result.data;
    }

    public async unwatch(
        config: IWatchParams<IGapiOauth>,
        channelId: string,
    ) {
        // load resource ID from redis (it's frustrating that
        // it's not the same as the fileId...)
        const [resourceId, _] = await redis.multi(m => {
            const k = `gapi:${channelId}:res`;
            m.get(k);
            m.del(k);
        });
        if (!resourceId) {
            // his watch has ended
            return;
        }

        await this.api.channels.stop({
            auth: auth(config.auth),
            requestBody: {
                id: channelId,
                resourceId: resourceId as string,
            },
        });
    }
}

export const GapiPushService = new GapiPushServiceImpl();
