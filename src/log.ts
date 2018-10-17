import { createLogger, format, transports } from "winston";

export const logger = createLogger({
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(info => {
            let msg = `${info.timestamp} ${info.level}: ${info.message}`;

            delete info.timestamp;
            delete info.level;
            delete info.message;

            const { error } = info;

            if (error instanceof Error) {
                // if it's not an Error, we want to stringify it next
                delete info.error;
            }

            if (Object.keys(info).length) {
                msg += " " + JSON.stringify(info);
            }

            // error stack traces come last
            if (error instanceof Error) {
                // msg += `\n${JSON.stringify((error as any).config)}`;
                msg += `\n${error.stack}`;
            }

            return msg;
        }),
    ),
    level: "info",
    transports: [
        new transports.Console(),
    ],
});
