
export interface IWatchParams<Auth> {
    auth: Auth;

    /**
     * The Provider-specific ID
     */
    fileId: string;

    /**
     * Token used to verify legitimacy of a push
     */
    token: string;
}

export interface IProvider<Auth> {
    watch(
        config: IWatchParams<Auth>,
        channelId: string,
        ttlSeconds: number,
    ): Promise<any>;

    unwatch(
        config: IWatchParams<Auth>,
        channelId: string,
    ): Promise<any>;

    validate(auth: Auth): Promise<any> | never;

    verifyCanEdit(auth: Auth, fileId: string): Promise<any>;
}
