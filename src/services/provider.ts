import { unpackSheetId } from "../util/sheet";
import { IProvider } from "./provider/core";
import { GdriveProvider } from "./provider/gdrive";

/*
 * The Provider service provides an abstraction on top of
 * different push providers. They are analogous to the ones
 * on the client
 */

export const providers: {[kind: string]: IProvider<any>} = {
};

export const knownProviders: string[] = [];

export async function init() {
    providers.gdrive = new GdriveProvider();

    const ids = Object.keys(providers);
    knownProviders.push(...ids);
}

export interface IProviderService {
    knownProviders: string[];
    byId(providerId: string): IProvider<any>;
    forSheet(sheetId: string): IProvider<any>;
}

export class ProviderService implements IProviderService {

    get knownProviders(): string[] {
        return knownProviders;
    }

    public byId(providerId: string): IProvider<any> {
        const inst = providers[providerId];
        if (!inst) {
            throw new Error(`Unknown provider '${providerId}'`);
        }

        return inst;
    }

    public forSheet(sheetId: string): IProvider<any> {
        const { provider } = unpackSheetId(sheetId);
        const inst = providers[provider];
        if (!inst) {
            throw new Error(`Unknown provider '${provider}' for sheet id ${sheetId}`);
        }

        return inst;
    }
}
