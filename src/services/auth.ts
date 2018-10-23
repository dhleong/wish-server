
export interface IAuth {
    grive?: any;
}

export interface IAuthService {
    validate(auth: any): IAuth | never;
}

export class AuthService implements IAuthService {
    public validate(auth: any): IAuth | never {
        return auth as IAuth;
    }
}
