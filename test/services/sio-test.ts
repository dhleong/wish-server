import * as chai from "chai";

import { convertCorsHost } from "../../src/services/sio";

chai.should();
const { expect } = chai;

const doConvert = (input: string): string => {
    const result = convertCorsHost(input);
    if (!result) throw new Error("No result");
    return result;
};

describe("convertCorsHost", () => {
    it("returns nothing if given nothing", () => {
        expect(convertCorsHost(undefined)).to.be.undefined;
    });

    it("should add the port", () => {
        doConvert("https://dhleong.github.io").should.equal(
            "https://dhleong.github.io:443",
        );

        doConvert("http://dhleong.github.io").should.equal(
            "http://dhleong.github.io:80",
        );
    });
});
