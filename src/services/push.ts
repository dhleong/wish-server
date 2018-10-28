import uuid from "uuid/v4";

import { InputError, requireInput, requireKey } from "../errors";
import { logger } from "../log";
import services from "../services";
import * as redis from "./redis";

/**
 * Webhook receiver for "changed" notifications from a Provider
 */
export async function send(channel: string, token: string) {
    requireInput(channel, "channel");
    requireInput(token, "token");

    // unpack() verifies the validity of the token
    // and throws an exception if it's not legit
    const {
        sheetId,
    } = services.token.unpack(token);

    // NOTE: anyone interested in this sheet is listening
    // on a channel named by the sheetId
    services.sse.sendChanged(sheetId, sheetId);
}
