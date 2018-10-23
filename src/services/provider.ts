import { IProvider } from "./provider/core";
import { GdriveProvider } from "./provider/gdrive";

/*
 * The Provider service provides an abstraction on top of
 * different push providers. They are analogous to the ones
 * on the client
 */

export const providers: {[kind: string]: IProvider<any>} = {
    gdrive: GdriveProvider,
};

export const knownProviders = Object.keys(providers);
