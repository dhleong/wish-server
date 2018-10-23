/*
 * Google Drive implementation of IProvider
 */

import { OAuth2Client } from "google-auth-library";
import { drive_v3, google } from "googleapis";

import { requireKey } from "../../errors";
import * as redis from "../redis";
import { IProvider, IWatchParams } from "./core";

const DEFAULT_PUSH_URL = "https://wish-server.now.sh/v1/push/send";

const OAUTH_CLIENT_ID: string = requireKey(process.env, "GAPI_OAUTH_ID");

export interface IGdriveOauth {
    access_token: string;
    token_type: string;
    id_token: string;
}

function oauth(token: IGdriveOauth) {
    const inst = new google.auth.OAuth2();
    inst.setCredentials(token);
    return inst;
}

class GdriveProviderImpl implements IProvider<IGdriveOauth> {

    private api = new drive_v3.Drive({});
    private oauthClient = new OAuth2Client(OAUTH_CLIENT_ID);

    public async watch(
        config: IWatchParams<IGdriveOauth>,
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
            auth: oauth(config.auth),
            fileId: config.fileId,
            requestBody: {
                address: process.env.GAPI_PUSH_URL || DEFAULT_PUSH_URL,
                expiration: "" + (Date.now() + watchDurationMillis),
                id: channelId,
                token: config.token,
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
        config: IWatchParams<IGdriveOauth>,
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
            auth: oauth(config.auth),
            requestBody: {
                id: channelId,
                resourceId: resourceId as string,
            },
        });
    }

    public async validate(auth: IGdriveOauth) {
        const idToken: string = requireKey(auth, "id_token");
        const accessToken = requireKey(auth, "access_token");
        await this.oauthClient.verifyIdToken({
            audience: OAUTH_CLIENT_ID,
            idToken,
        });
    }
}

export const GdriveProvider = new GdriveProviderImpl();
