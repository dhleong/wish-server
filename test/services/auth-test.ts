import * as chai from "chai";

import { AuthService } from "../../src/services/auth";
import { FakeProvider, integrate } from "../test-integration";

chai.should();

describe("auth service", () => {
    it("validates the right auth", integrate(async ({ provider }) => {
        const authMap = {fake: {key: "firefly"}};
        const svc = new AuthService();
        const result = await svc.validate(authMap);

        result.should.deep.equal(authMap);

        const p = provider.byId("fake") as FakeProvider;
        p.validateRequests.should.deep.equal([
            {key: "firefly"},
        ]);
    }));
});
