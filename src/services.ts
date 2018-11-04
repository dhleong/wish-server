import { IAuthService } from "./services/auth";
import { IChannelServiceImpl, IChannelsService } from "./services/channels";
import { IProviderService } from "./services/provider";
import { ISSEService } from "./services/sse";
import { ITokenService } from "./services/token";

export default { channelTypes: {} } as any as {
    auth: IAuthService,
    channels: IChannelsService,
    provider: IProviderService,
    token: ITokenService,

    // channel-type services; these should generally
    // not be accessed directly
    channelTypes: {
        sse: ISSEService,
        sio: IChannelServiceImpl,
    },
};
