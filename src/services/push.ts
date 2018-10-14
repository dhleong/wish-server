
import * as webPush from "web-push";
import { logger } from "../log";

/**
 * Initialize the service
 */
export async function init() {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
        // tslint:disable-next-line
        console.log(
            "You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY " +
            "environment variables. You can use the following ones:",
            webPush.generateVAPIDKeys(),
        );
        return;
    }

    webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || "https://dhleong.github.io/wish",
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY,
    );
}

/**
 * Register a web-push receiver
 */
export async function register(body: any) {
    // TODO
    logger.info("register with", body);
}

/**
 * Webhook receiver for web-push
 */
export async function send(body: any) {
    // TODO
    logger.info("SEND", body);

    const {
        subscription,
        ttl,
    } = body;

    const payload = null;

    const options = {
        TTL: ttl,
    };

    return webPush.sendNotification(subscription, payload, options);
}
