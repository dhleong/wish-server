import * as chai from "chai";

import { EventId } from "../../src/services/channels";
import { SelectiveMemoryBus } from "../../src/services/sse";
import { TestableSSE } from "../testable-sse";

chai.should();

describe("SelectiveMemoryBus", () => {
    let c1: TestableSSE;
    let c2: TestableSSE;
    let c3: TestableSSE;
    let bus: SelectiveMemoryBus;

    beforeEach(() => {
        c1 = new TestableSSE();
        c2 = new TestableSSE();
        c3 = new TestableSSE();

        // our bus always "randomly" selects the first
        // remaining item of a set
        bus = new SelectiveMemoryBus(2, () => 0);

        bus.register("channel", c1);
        bus.register("channel", c2);
        bus.register("channel", c3);
    });

    it("Sends to all for `changed`", () => {
        const event = {
            data: JSON.stringify({ event: "changed" }),
        };
        bus.send("channel", event);

        c1.sent.should.deep.equal([event]);
        c2.sent.should.deep.equal([event]);
        c3.sent.should.deep.equal([event]);
    });

    it("Sends to a subset for need-watch", () => {
        const event = {
            comment: EventId.NeedWatch,
            data: JSON.stringify({ event: "changed" }),
        };
        bus.send("channel", event);

        c1.sent.should.deep.equal([event]);
        c2.sent.should.deep.equal([event]);
        c3.sent.should.be.empty;
    });
});
