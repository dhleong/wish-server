import services from "../services";

export interface IAuth {
    gdrive?: any;
}

export interface IAuthService {
    validate(auth: any): Promise<IAuth> | never;
}

export class AuthService implements IAuthService {
    public async validate(auth: any): Promise<IAuth> | never {
        for (const providerId of services.provider.knownProviders) {
            const thisAuth = auth[providerId];
            if (!thisAuth) continue;

            const provider = services.provider.byId(providerId);
            await provider.validate(thisAuth);
        }
        return auth as IAuth;
    }
}
