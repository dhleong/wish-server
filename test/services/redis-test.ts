import * as chai from "chai";

import { EventId } from "../../src/services/channels";
import * as watch from "../../src/services/watch";
import { integrate } from "../test-integration";
import { sleep } from "../test-utils";

chai.should();

describe("Redis Service", () => {
    it("dispatches needWatch when on expire", integrate(async ({ channels }) => {
        const sessionId = "my-session";
        const ttl = 1;
        await watch.create(
            sessionId,
            {},
            ["mySheetId"],
            ttl,
        );

        // nothing yet
        channels.sent.should.be.empty;

        // sleep for a tiny bit to wait for the expiration
        await sleep(1500);

        // request sent
        channels.sent.should.deep.equal({
            mySheetId: [
                {
                    data: { id: "mySheetId" },
                    event: EventId.NeedWatch,
                },
            ],
        });
    }));
});
