import * as chai from "chai";

import { default as SIOClient } from "socket.io-client";

import { EventId } from "../../src/services/channels";
import { convertCorsHost, SelectiveSIOAdapter, SOCKET_PATH, SocketIoService } from "../../src/services/sio";
import { sleep } from "../test-utils";

chai.should();
const { expect } = chai;

const doConvert = (input: string): string => {
    const result = convertCorsHost(input);
    if (!result) throw new Error("No result");
    return result;
};

class VerySelectiveSIOAdapter extends SelectiveSIOAdapter {
    constructor(nsp: SocketIO.Namespace) {
        super(nsp, /* maxNeedWatch: */ 1);
    }
}

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

describe("SocketIoService", () => {

    const localPort = 42123;
    let myService: SocketIoService;
    let clients: SocketIOClient.Socket[] = [];

    function newClient(messageQueue: any[]) {
        const client = SIOClient(`http://localhost:${localPort}/channel`, {
            path: SOCKET_PATH,
        });
        client.on("message", (m: any) => {
            messageQueue.push(m);
        });
        clients.push(client);
        return client;
    }

    function newService() {
        const service = new SocketIoService(
            localPort, undefined, VerySelectiveSIOAdapter,

            // fake connect:
            async sessionId => ({
                channels: ["channel"],
                interestedIds: [],
            }),

            // fake destroy:
            async (sessionId, interestedIds) => {
                return;
            },
        );
        myService = service;
        return service;
    }

    function clientsConnected() {
        return Promise.all(clients.map(c => {
            if (c.connected) return Promise.resolve({});
            return new Promise((resolve, reject) => {
                c.on("connect", resolve);
                c.on("error", reject);
            });
        }));
    }

    afterEach(() => {
        if (myService) myService.close();
        for (const c of clients) {
            c.close();
        }
        clients = [];
    });

    it("limits the audience of NeedWatch", async () => {
        const receivedMessages: any[] = [];

        const svc = newService();
        newClient(receivedMessages);
        newClient(receivedMessages);
        newClient(receivedMessages);
        await clientsConnected();

        svc.send("channel", EventId.NeedWatch, { id: "test" });
        await sleep(100);

        receivedMessages.should.have.lengthOf(1);
    });
});
