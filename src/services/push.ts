
import { AuthError, requireInput } from "../errors";
import services from "../services";
import * as redis from "../services/redis";

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

/**
 * Send a DM event on the given sessionId
 *
 * @param sessionId ID of the DM session. This acts as a bearer token
 *  in that whoever knows the session ID is assumed to be authorized
 *  to use it.
 */
export async function sendDmEvent(sessionId: string, event: any) {
    requireInput(sessionId, "sessionId");
    requireInput(event, "event");

    const dmId = await redis.getClient().get(`dm:${sessionId}`);
    if (!dmId) {
        // no such DM session
        throw new AuthError("No such DM session");
    }

    services.channels.sendDmEvent(dmId, event);
}
