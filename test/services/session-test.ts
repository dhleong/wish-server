import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

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

        const { interestedIds } = await session.connect(sessionId);
        interestedIds.should.deep.equal(ids);

        // session IDs are one-time use for connect
        await session.connect(
            sessionId,
        ).should.eventually.be.rejectedWith(AuthError);
    }));

    it("allows re-joining after a disconnect", integrate(async ({ redis }) => {
        const ids = ["1", "2"];

        const sessionId = await session.create({}, ids);
        sessionId.should.not.be.empty;

        const { interestedIds } = await session.connect(sessionId);
        interestedIds.should.deep.equal(ids);

        // the client loses connection briefly
        await session.destroy(sessionId, ids);

        // if they come back in time, the session is still waiting.
        // Otherwise, they'll have to create a new session (which is fine)
        const { interestedIds: returnedIds } = await session.connect(sessionId);
        returnedIds.should.deep.equal(ids);
    }));

    it("keeps watcher on destroy", integrate(async ({ redis, channels }) => {
        const ids = ["1", "2"];

        const watcherSid = await session.create({}, ids);
        watcherSid.should.not.be.empty;

        // watcherSid should be in charge
        (await redis.mget(`watcher:1`, `watcher:2`)).should.deep.equal([
            watcherSid, watcherSid,
        ]);

        await session.connect(watcherSid);

        const otherSid = await session.create({}, ids);
        otherSid.should.not.be.empty;

        // watcherSid should still be in charge
        (await redis.mget(`watcher:1`, `watcher:2`)).should.deep.equal([
            watcherSid, watcherSid,
        ]);

        await session.connect(otherSid);

        // when watcherSid leaves...
        await session.destroy(
            watcherSid,
            ids,
        );

        // the old watch is still valid (it expires after several hours);
        // nothing should have happened
        const watchers = await redis.mget(`watcher:1`, `watcher:2`);
        watchers.should.deep.equal([
            watcherSid, watcherSid,
        ]);

        channels.sent.should.be.empty;
    }));

    it("does not generate needWatch from last watcher", integrate(async ({ channels }) => {
        const ids = ["1", "2"];

        const watcherSid = await session.create({}, ids);
        watcherSid.should.not.be.empty;

        channels.sent.should.be.empty;

        await session.connect(watcherSid);

        // when watcherSid leaves...
        await session.destroy(
            watcherSid,
            ids,
        );

        // ... no new messages should have be sent
        channels.sent.should.be.empty;
    }));

    it("handles DM session requests", integrate(async ({ provider, redis }) => {
        const ids = ["1", "2"];
        const dmId = "gdrive/wdmid";

        provider.inst.editableFiles.add("dmid");
        const sessionId = await session.create({}, ids, dmId);

        // if the session was created, we should also have set
        // what sheet we're the DM of
        const setDmId = redis.get(`dm:${sessionId}`);
        await setDmId.should.eventually.equal(dmId);
    }));

    it("verifies DM session requests", integrate(async ({ provider, redis }) => {
        const ids = ["1", "2"];
        const dmId = "gdrive/wdmid";

        // NOTE: above we add the fileId to editableFiles on the Fake.
        // By skipping that, we simulate an auth error from that service

        await session.create({}, ids, dmId)
            .should.eventually.be.rejected;
    }));
});
