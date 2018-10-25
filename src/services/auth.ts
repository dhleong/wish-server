import { InputError } from "../errors";
import services from "../services";

export interface IAuth {
    gdrive?: any;
}

export interface IAuthService {
    validate(auth: any): Promise<IAuth> | never;
}

export class AuthService implements IAuthService {
    public async validate(auth: any): Promise<IAuth> | never {
        const allValidates = [];
        for (const providerId of services.provider.knownProviders) {
            const thisAuth = auth[providerId];
            if (!thisAuth) continue;

            const provider = services.provider.byId(providerId);
            allValidates.push( provider.validate(thisAuth) );
        }

        try {
            await Promise.all(allValidates);
        } catch (e) {
            throw new InputError(`Invalid auth`, e);
        }

        return auth as IAuth;
    }
}
