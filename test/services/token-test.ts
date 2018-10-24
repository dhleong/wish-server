import * as chai from "chai";

import { TokenService } from "../../src/services/token";

chai.should();

describe("token service", () => {
    it("should successfully round-trip", () => {
        const svc = new TokenService("not-a-secret");
        const token = svc.generate("firefly/serenity");
        const {
            sheetId,
        } = svc.unpack(token);

        sheetId.should.equal("firefly/serenity");
    });
});
