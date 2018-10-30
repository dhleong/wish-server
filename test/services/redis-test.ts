import * as chai from "chai";

import * as watch from "../../src/services/watch";
import { integrate } from "../test-integration";

chai.should();

const sleep = (durationMillis: number) => new Promise(resolve => {
    setTimeout(resolve, durationMillis);
});

describe("Redis Service", () => {
    it("dispatches needWatch when on expire", integrate(async ({ bus }) => {
        const sessionId = "my-session";
        const ttl = 1;
        await watch.create(
            sessionId,
            {},
            ["mySheetId"],
            ttl,
        );

        // nothing yet
        bus.sent.should.be.empty;

        // sleep for a tiny bit to wait for the expiration
        await sleep(1500);

        // request sent
        bus.sent.should.deep.equal({
            mySheetId: [
                {data: `{"data":{"id":"mySheetId"},"event":"need-watch"}`},
            ],
        });
    }));
});
