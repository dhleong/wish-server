import * as chai from "chai";

import { ServerSideEvents } from "lightside";

import * as session from "../../src/services/session";
import { integrate } from "../test-integration";

chai.should();

describe("session service", () => {
    it("nominates new watchers on destroy", integrate(async ({ redis, bus }) => {
        const cli = new ServerSideEvents();
        const ids = ["1", "2"];

        const watcherSid = await session.create(cli, {}, ids);
        watcherSid.should.not.be.empty;

        // watcherSid should be in charge
        (await redis.mget(`watcher:1`, `watcher:2`)).should.deep.equal([
            watcherSid, watcherSid,
        ]);

        const otherSid = await session.create(cli, {}, ids);
        watcherSid.should.not.be.empty;

        // watcherSid should still be in charge
        (await redis.mget(`watcher:1`, `watcher:2`)).should.deep.equal([
            watcherSid, watcherSid,
        ]);

        // when watcherSid leaves...
        await session.destroy(
            watcherSid,
            ids,
        );

        // ... now, otherSid should have been nominated
        const watchers = await redis.mget(`watcher:1`, `watcher:2`);
        watchers.should.deep.equal([
            null, null,
        ]);

        bus.sent[otherSid].slice(1).should.deep.equal([
            { event: "need-watch", data: `{"id":"1"}` },
            { event: "need-watch", data: `{"id":"2"}` },
        ]);
    }));
});
