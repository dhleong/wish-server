import { AuthService, IAuthService } from "./services/auth";
import { IProviderService, ProviderService } from "./services/provider";
import { ISSEService, SSEService } from "./services/sse";
import { ITokenService, TokenService } from "./services/token";

export default {
    auth: new AuthService() as IAuthService,
    provider: new ProviderService() as IProviderService,
    sse: new SSEService() as ISSEService,
    token: new TokenService() as ITokenService,
};
