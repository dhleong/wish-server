import * as chai from "chai";
import { unpackSheetId } from "../../src/util/sheet";

chai.should();

describe("unpackSheetId", () => {
    it("unpacks IDs", () => {
        unpackSheetId("gdrive/wserenity").should.deep.equal({
            id: "serenity",
            provider: "gdrive",
        });
    });
});
