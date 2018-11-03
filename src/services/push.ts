
import { requireInput } from "../errors";
import services from "../services";

/**
 * Webhook receiver for "changed" notifications from a Provider
 */
export async function notifyChanged(channel: string, token: string) {
    requireInput(channel, "channel");
    requireInput(token, "token");

    // unpack() verifies the validity of the token
    // and throws an exception if it's not legit
    const {
        sheetId,
    } = services.token.unpack(token);

    // NOTE: anyone interested in this sheet is listening
    // on a channel named by the sheetId
    services.channels.sendChanged(sheetId, sheetId);
}
