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

            if (Object.keys(info).length) {
                msg += " " + JSON.stringify(info);
            }

            return msg;
        }),
    ),
    level: "info",
    transports: [
        new transports.Console(),
    ],
});
