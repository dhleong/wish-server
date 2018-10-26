import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { ServerSideEvents } from "lightside";

import { AuthError } from "../../src/errors";
import * as session from "../../src/services/session";
import { integrate } from "../test-integration";

chai.use(chaiAsPromised);
chai.should();

describe("session service", () => {
    it("properly handles joining the created session", integrate(async ({ redis }) => {
        const ids = ["1", "2"];

        const sessionId = await session.create({}, ids);
        sessionId.should.not.be.empty;

        const cli = new ServerSideEvents();
        const channels = await session.connect(cli, sessionId);
        channels.should.deep.equal(ids);

        // session IDs are one-time use for connect
        const shadyCli = new ServerSideEvents();
        await session.connect(
            shadyCli,
            sessionId,
        ).should.eventually.be.rejectedWith(AuthError);
    }));

    it("allows re-joining after a disconnect", integrate(async ({ redis }) => {
        const ids = ["1", "2"];

        const sessionId = await session.create({}, ids);
        sessionId.should.not.be.empty;

        const cli = new ServerSideEvents();
        const channels = await session.connect(cli, sessionId);
        channels.should.deep.equal(ids);

        // the client loses connection briefly
        await session.destroy(sessionId, ids);

        // if they come back in time, the session is still waiting.
        // Otherwise, they'll have to create a new session (which is fine)
        const returnedIds = await session.connect(
            cli,
            sessionId,
        );
        returnedIds.should.deep.equal(ids);
    }));

    it("nominates new watchers on destroy", integrate(async ({ redis, bus }) => {
        const cli = new ServerSideEvents();
        const ids = ["1", "2"];

        const watcherSid = await session.create({}, ids);
        watcherSid.should.not.be.empty;

        // watcherSid should be in charge
        (await redis.mget(`watcher:1`, `watcher:2`)).should.deep.equal([
            watcherSid, watcherSid,
        ]);

        await session.connect(cli, watcherSid);

        const otherSid = await session.create({}, ids);
        otherSid.should.not.be.empty;

        // watcherSid should still be in charge
        (await redis.mget(`watcher:1`, `watcher:2`)).should.deep.equal([
            watcherSid, watcherSid,
        ]);

        await session.connect(cli, otherSid);

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

        bus.sent[otherSid].should.deep.equal([
            { event: "need-watch", data: `{"id":"1"}` },
            { event: "need-watch", data: `{"id":"2"}` },
        ]);
    }));

    it("does not generate needWatch from last watcher", integrate(async ({bus}) => {
        const cli = new ServerSideEvents();
        const ids = ["1", "2"];

        const watcherSid = await session.create({}, ids);
        watcherSid.should.not.be.empty;

        bus.sent.should.be.empty;

        await session.connect(cli, watcherSid);

        // when watcherSid leaves...
        await session.destroy(
            watcherSid,
            ids,
        );

        // ... no new messages should have be sent
        bus.sent.should.be.empty;
    }));
});
