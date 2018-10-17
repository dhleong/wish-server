import * as webPush from "web-push";

export interface IChannelContext {
    id: string;
    kind: string;
}

export interface IChannelInfo {
    context: IChannelContext;
    subscription?: webPush.PushSubscription;
    userId: string;
}

export interface IWatchParams<Auth> extends IChannelInfo {
    auth: Auth;
}

export interface IPushService<Auth> {
    watch(
        config: IWatchParams<Auth>,
        channelId: string,
        isNewChannel: boolean,
    ): Promise<any>;

    unwatch(
        config: IWatchParams<Auth>,
        channelId: string,
    ): Promise<any>;
}
