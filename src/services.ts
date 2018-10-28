import { IAuthService } from "./services/auth";
import { IProviderService } from "./services/provider";
import { ISSEService } from "./services/sse";
import { ITokenService } from "./services/token";

export default { } as any as {
    auth: IAuthService,
    provider: IProviderService,
    sse: ISSEService,
    token: ITokenService,
};
