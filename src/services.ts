import { AuthService, IAuthService } from "./services/auth";
import { ISSEService, SSEService } from "./services/sse";

export default {
    auth: new AuthService() as IAuthService,
    sse: new SSEService() as ISSEService,
};
