import jwt from "jsonwebtoken";

import { requireInput, requireKey } from "../errors";

// NOTE: we defer init of this so unit tests don't require it
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = "wish-server";

export interface ITokenPayload {
    sheetId: string;
}

export async function init() {
    // verify secret is provided
    requireKey(process.env, "JWT_SECRET");
}

export interface ITokenService {
    generate(sheetId: string): string;
    unpack(token: string): ITokenPayload;
}

export class TokenService {

    constructor(
        private secret: string = JWT_SECRET as string,
    ) {}

    public generate(sheetId: string) {
        requireInput(this.secret, "JWT_SECRET");

        return jwt.sign({
            sheetId,
        }, this.secret, {
            expiresIn: "6h",
            issuer: JWT_ISSUER,
        });
    }

    public unpack(token: string): ITokenPayload {
        requireInput(this.secret, "JWT_SECRET");

        return jwt.verify(token, this.secret, {
            issuer: JWT_ISSUER,
        }) as ITokenPayload;
    }

}
