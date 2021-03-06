
export class ErrorWithCause extends Error {
    constructor(message: string, public cause: Error | null = null) {
        super(message + (cause ? `: ${cause.message}` : ""));
    }
}

function newErrorWithCause(defaultMessage: string) {
    return class extends ErrorWithCause {
        constructor(message: string = defaultMessage, public cause: Error | null = null) {
            super(message, cause);
        }
    };
}

/**
 * An AuthError means bad auth info was provided to a service.
 * This is returned to REST clients as a 401
 */
export const AuthError = newErrorWithCause("Unauthorized");

/**
 * An InputError means bad input was provided to a service.
 * This is returned to REST clients as a 400
 */
export const InputError = newErrorWithCause("Invalid input");

/**
 * NOTE: if you need to use this as a type guard, you can simply do:
 *
 *      if (!requireInput(v, "name")) return;
 *
 * Since it will never actually return false, but throw instead. This is
 * a deficiency in Typescript that throwing doesn't work as a type guard
 */
export function requireInput<T>(value: T | undefined | null, name: string): T | never {
    if (!value) throw new InputError(`${name} is required`);

    if (typeof value === "string" && value === "") {
        throw new InputError(`${name} must not be blank`);
    }

    return value;
}

export function requireKey<T, K extends keyof T, R extends Required<T>[K]>(value: T, k: K): R | never {
    if (!value) throw new InputError(`${name} is required`);

    return requireInput(value[k], k.toString()) as any as R;
}
