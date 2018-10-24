import * as chai from "chai";

import { TokenService } from "../../src/services/token";

chai.should();

describe("token service", () => {
    it("should successfully round-trip", () => {
        const svc = new TokenService("not-a-secret");
        const token = svc.generate("firefly/serenity");
        const {
            fileId,
        } = svc.unpack(token);

        fileId.should.equal("firefly/serenity");
    });
});
