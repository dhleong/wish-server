import { knownProviders, providers } from "./provider";

export interface IAuth {
    gdrive?: any;
}

export interface IAuthService {
    validate(auth: any): Promise<IAuth> | never;
}

export class AuthService implements IAuthService {
    public async validate(auth: any): Promise<IAuth> | never {
        for (const provider of knownProviders) {
            const thisAuth = auth[provider];
            if (!thisAuth) continue;

            await providers[provider].validate(auth);
        }
        return auth as IAuth;
    }
}
