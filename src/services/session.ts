
import uuid from "uuid/v4";

import { AuthError, InputError } from "../errors";
import services from "../services";
import * as redis from "./redis";
import * as watch from "./watch";

export async function connect(
    sessionId: string,
) {
    // load the session
    const [ idsRaw ] = await redis.multi(m => {
        m.get(sessionId);
        m.del(sessionId); // only one person can use this session
    });
    if (!idsRaw) {
        throw new AuthError("No such session");
    }

    const interestedIds: string[] = JSON.parse(idsRaw as string);
    if (!(interestedIds && Array.isArray(interestedIds) && interestedIds.length)) {
        throw new AuthError("No such session");
    }

    // we're interested in a channel just for our session,
    // and one for each of the sheets we're interested in
    return {
        interestedIds,

        channels: [sessionId].concat(interestedIds),
    };
}

export async function create(
    rawAuth: any,
    interestedIds: string[],
) {
    if (!interestedIds.length) {
        throw new InputError(`interestedIds must not be empty`);
    }

    // validate auth
    const auth = await services.auth.validate(rawAuth);

    // create session and listen to it
    const sessionId = uuid();

    // attempt to watch any files that need it;
    // the `watch` service will ignore dups
    await watch.create(sessionId, auth, interestedIds);

    // NOTE: because EventSource doesn't support POST,
    // we have to do two round trips. So, we store the
    // interested ids on the session for a few minutes
    // until they come back with the EventSource request
    await prepareSession(sessionId, interestedIds);

    return sessionId;
}

export async function destroy(
    sessionId: string,
    interestedIds: string[],
) {
    if (!interestedIds.length) {
        throw new InputError(`interestedIds must not be empty`);
    }

    // re-prepare the session in case they reconnect
    await prepareSession(sessionId, interestedIds);
}

async function prepareSession(
    sessionId: string,
    interestedIds: string[],
) {
    return redis.getClient().setex(sessionId, 5 * 60, JSON.stringify(interestedIds));
}
