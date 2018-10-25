import { AuthService, IAuthService } from "./services/auth";
import { IProviderService, ProviderService } from "./services/provider";
import { ISSEService, SSEService } from "./services/sse";
import { ITokenService, TokenService } from "./services/token";

export default { } as any as {
    auth: IAuthService,
    provider: IProviderService,
    sse: ISSEService,
    token: ITokenService,
};
