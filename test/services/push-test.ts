import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { sendDmEvent } from "../../src/services/push";
import { create } from "../../src/services/session";
import { integrate } from "../test-integration";

chai.use(chaiAsPromised);
chai.should();

describe("sendDmEvent", () => {
    it("verifies DM session", integrate(async () => {
        await sendDmEvent("no-such", { type: "any" })
            .should.eventually.be.rejectedWith(/No such/);
    }));

    it("sends event for valid sessions", integrate(async ({ channels, provider }) => {
        const ids = ["1", "2"];
        const dmId = "gdrive/wdmid";

        provider.inst.editableFiles.add("dmid");
        const sessionId = await create(
            {},
            ids,
            dmId,
        );

        await sendDmEvent(sessionId, { type: "any" });
        channels.sent.should.deep.equal({
            [dmId]: [
                {
                    data: { type: "any" },
                    event: "dm",
                },
            ],
        });
    }));
});
