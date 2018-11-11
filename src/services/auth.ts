import { InputError } from "../errors";
import services from "../services";
import { unpackSheetId } from "../util/sheet";
import { IGdriveOauth } from "./provider/gdrive";

export interface IAuth {
    gdrive?: IGdriveOauth;
}

export interface IAuthService {
    validate(auth: any): Promise<IAuth> | never;

    verifyCanEdit(auth: IAuth, dmId: string): Promise<void>;
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

    public async verifyCanEdit(auth: IAuth, fileId: string) {
        const { id, provider: providerId } = unpackSheetId(fileId);
        const provider = services.provider.byId(providerId);
        if (!provider) {
            throw new InputError(`File id ${fileId} has invalid provider`);
        }

        return provider.verifyCanEdit((auth as any)[providerId], id);
    }
}
