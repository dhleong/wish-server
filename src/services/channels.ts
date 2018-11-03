import services from "../services";

export enum EventId {
    Changed = "changed",
    NeedWatch = "need-watch",
}

export interface IChannelsService {
    sendChanged(sessionId: string, sheetId: string): void;

    // tslint:disable-next-line:unified-signatures since the param moves
    sendNeedWatch(sessionId: string, sheetId?: string): void;
    sendNeedWatch(sheetId: string): void;
}

/**
 * CompositeChannelsService delegates to SSE and SIO services
 */
export class CompositeChannelsService implements IChannelsService {
    public sendChanged(sessionId: string, sheetId: string): void {
        for (const serviceId of Object.keys(services.channelTypes)) {
            const svc = (services.channelTypes as any)[
                serviceId
            ] as IChannelsService;
            svc.sendChanged(sessionId, sheetId);
        }
    }

    public sendNeedWatch(sessionId: any, sheetId?: any) {
        for (const serviceId of Object.keys(services.channelTypes)) {
            const svc = (services.channelTypes as any)[
                serviceId
            ] as IChannelsService;
            svc.sendNeedWatch(sessionId, sheetId);
        }
    }
}

export abstract class BaseChannelsService implements IChannelsService {
    public sendChanged(sessionId: string, sheetId: string): void {
        this.send(sessionId, EventId.Changed, {
            id: sheetId,
        });
    }

    public sendNeedWatch(sheetId: string): void;
    public sendNeedWatch(sessionId: string, sheetId?: string | undefined): void {
        const actualSheetId = sheetId
            ? sheetId
            : sessionId;
        this.send(sessionId, EventId.NeedWatch, {
            id: actualSheetId,
        });
    }

    protected abstract send(channelId: string, event: EventId, data: any): void;
}
