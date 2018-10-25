
import { ServerSideEvents } from "lightside";
import uuid from "uuid/v4";

import { InputError } from "../errors";
import { logger } from "../log";
import services from "../services";
import * as redis from "./redis";
import * as watch from "./watch";

export async function create(
    client: ServerSideEvents,
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
    services.sse.addToChannel(sessionId, client);

    client.send({
        data: JSON.stringify({
            id: sessionId,
        }),
        event: "session-created",
    });

    // handle client disconnect
    client.once("close", async () => {
        try {
            logger.info(`Destroy ${sessionId}`);
            await destroy(sessionId, interestedIds);
        } catch (e) {
            logger.warn(`Error destroying session ${sessionId}`, {error: e});
        }
    });

    // listen for changes on our interested sheets
    services.sse.addToChannel(interestedIds, client);

    // attempt to watch any files that need it;
    // the `watch` service will ignore dups
    await watch.create(sessionId, auth, interestedIds);

    // record interest so we can get pushes
    // we do this *after* attempting to create watches so
    // there's no dangling data if it fails
    await setWatching(sessionId, interestedIds, true);

    // send "session-created"
    services.sse.sendSessionCreated(sessionId);

    return sessionId;
}

const promoteNewWatchers = new redis.Script<[number, string]>(`
    local idsCount = ARGV[1]
    local sessionId = ARGV[2]
    local watcherIds = { unpack(KEYS, 1, idsCount) }
    local watchersIds = { unpack(KEYS, idsCount + 1) }

    local allWatchers = redis.call("MGET", unpack(watcherIds))
    for i, currentWatcher in ipairs(allWatchers)
    do
        -- if we were watching this sheet
        if currentWatcher == sessionId
        then
            -- demote ourselves
            redis.call("DEL", watcherIds[i])
        end
    end

    -- promote in a separate loop *after* the DEL commands above;
    -- write commands are not allowed after non-deterministic ones
    local promoted = {}
    for i, currentWatcher in ipairs(allWatchers)
    do
        -- if we were watching this sheet
        if currentWatcher == sessionId
        then
            -- promote a random watcher
            table.insert(promoted, watcherIds[i])
            table.insert(promoted, redis.call("SRANDMEMBER", watchersIds[i]))
        end
    end

    return promoted
`);

export async function destroy(
    sessionId: string,
    interestedIds: string[],
) {
    if (!interestedIds.length) {
        throw new InputError(`interestedIds must not be empty`);
    }

    // stop watching
    await setWatching(sessionId, interestedIds, false);

    // for all `ID` where `watcher:ID` == sessionId:
    //   get random entry of `watchers:ID`
    //   set `watcher:ID` <- NIL
    const newWatcherPairs = await promoteNewWatchers.eval(
        interestedIds.map(id => `watcher:${id}`).concat(
            interestedIds.map(id => `watchers:${id}`),
        ),
        [
            interestedIds.length,
            sessionId,
        ],
    );

    // generate "need-watch" on each `random entry`
    for (let i = 0; i < newWatcherPairs.length; i += 2) {
        const sheetId = (newWatcherPairs[i] as string).substr("watcher:".length);
        const newWatcherSession = (newWatcherPairs[i + 1] as string);
        services.sse.sendNeedWatch(newWatcherSession, sheetId);
    }
}

async function setWatching(
    sessionId: string,
    fileIds: string[],
    isWatching: boolean,
) {
    return redis.multi(m => {
        for (const id of fileIds) {
            const key = `watchers:${id}`;
            if (isWatching) {
                m.sadd(key, sessionId);
            } else {
                m.srem(key, sessionId);
            }
        }
    });
}
