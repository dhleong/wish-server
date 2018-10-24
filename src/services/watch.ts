import config from "../config";
import services from "../services";
import { IAuth } from "./auth";
import * as redis from "./redis";

/**
 * Attempt to create watches for the files with
 * the given IDs, owned by `sessionId` and authenticated
 * with the provided auth
 */
export async function create(
    sessionId: string,
    rawAuth: any,
    ids: string[],
) {
    // validate auth
    const auth = await services.auth.validate(rawAuth);

    // request the current "watcher" for each file
    const watchers = await redis.multi(m => {
        for (const id of ids) {
            m.get(`watcher:${id}`);
        }
    });

    // filter interestedIds down to the list of files
    // that need a watcher
    const needWatchFiles: string[] = [];
    for (let i = 0; i < ids.length; ++i) {
        if (!watchers[i]) {
            needWatchFiles.push(ids[i]);
        }
    }

    return Promise.all(needWatchFiles.map(id =>
        _createOne(sessionId, auth, id),
    ));
}

const setexIfNull = new redis.Script<[number, string]>(`
    local value = redis.call("GET", KEYS[1])
    if not value
    then
        redis.call("SETEX", KEYS[1], ARGV[1], ARGV[2])
        return ARGV[2]
    else
        return value
    end
`);

async function _createOne(
    sessionId: string,
    auth: IAuth,
    fileId: string,
) {
    const token = services.token.generate(fileId);

    // TODO get the right service
    // TODO create the watch

    // atomically set watcher:ID <- sessionId IFF watcher:ID is NIL
    const actualWatcher = await setexIfNull.eval([`watcher:${fileId}`], [
        config.watcherExpiration, sessionId,
    ]);
    if (actualWatcher !== sessionId) {
        // TODO we did not change watcher:ID; STOP the watch
    }
}
