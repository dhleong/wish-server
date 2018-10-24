import { AuthService, IAuthService } from "./services/auth";
import { ISSEService, SSEService } from "./services/sse";
import { ITokenService, TokenService } from "./services/token";

export default {
    auth: new AuthService() as IAuthService,
    sse: new SSEService() as ISSEService,
    token: new TokenService() as ITokenService,
};
