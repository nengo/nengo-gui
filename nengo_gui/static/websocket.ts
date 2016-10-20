function getURL(uid: string, typename: string = "component"): string {
    const hostname = window.location.hostname;
    let wsProto;
    if (window.location.protocol === "https:") {
        wsProto = "wss:";
    } else {
        wsProto = "ws:";
    }
    return wsProto + "//" + hostname + "/" + typename + "?uid=" + uid;
}

export interface Connection {
    typename: string;
    uid: string;

    bind(name: string, callback: (kwargs: any) => any): Connection;
    isBound(name: string): boolean;
    dispatch(name: string, kwargs?: any): Connection;
    send(name: string, kwargs?: any): Connection;
}

/**
 * Create a WebSocket connection to the given uid.
 *
 * This extends the normal WebSocket class with convenience methods
 * for binding and dispatching events to and from other clients
 * connected to the same websocket.
 *
 * @param {string} uid - The uid for the WebSocket.
 * @returns {WebSocket} The created WebSocket.
 */
export class WSConnection implements Connection {
    typename: string;
    uid: string;

    private callbacks: {[name: string]: ((kwargs: any) => any)[]};
    private ws: WebSocket;

    constructor(uid: string, typename: string = "component") {
        this.uid = uid;
        this.typename = typename;
        this.ws = new WebSocket(getURL(uid, typename));
        this.ws.onmessage = (event: MessageEvent) => {
            const json = JSON.parse(event.data);
            this.dispatch(json[0], json[1]);
        };

        this.ws.onclose = () => {
            this.dispatch("close");
        };

        this.ws.onopen = () => {
            this.dispatch("open");
        };
    }

    bind(name: string, callback: (any) => any): WSConnection {
        if (!(name in this.callbacks)) {
            this.callbacks[name] = [];
        }
        this.callbacks[name].push(callback);
        return this;
    }

    isBound(name: string) {
        return name in this.callbacks;
    }

    dispatch(name: string, kwargs: any = {}): WSConnection {
        if (name in this.callbacks) {
            this.callbacks[name].forEach(callback => {
                callback(kwargs);
            });
        } else {
            console.warn("Nothing bound for '" + name + "'");
        }
        return this;
    }

    send(name: string, kwargs: any = {}): WSConnection {
        const payload = JSON.stringify([name, kwargs]);
        this.ws.send(payload);
        return this;
    }
}

export class MockConnection implements Connection {
    static verbose: boolean = true;

    lastSentName: string;
    lastSent: any;
    typename: string = "mock";
    uid: string = "mock";

    private bound: string[] = [];

    bind(name: string, callback: (kwargs: any) => any): MockConnection {
        if (MockConnection.verbose) {
            console.log("binding " + name);
        }
        this.bound.push(name);
        return this;
    }

    isBound(name: string) {
        return this.bound.indexOf(name) !== -1;
    }

    dispatch(name: string, kwargs: any = {}): MockConnection {
        if (MockConnection.verbose) {
            console.log("dispatch " + name + "(" + Object.keys(kwargs) + ")");
        }
        return this;
    }

    send(name: string, kwargs: any = {}): MockConnection {
        if (MockConnection.verbose) {
            console.log("send " + name + "(" + Object.keys(kwargs) + ")");
        }
        this.lastSentName = name;
        this.lastSent = kwargs;
        return this;
    }
}

export interface FastConnection {
    // Nothing yet...
}

/**
 * Create a WebSocket connection to the given uid.
 *
 * This constrains the normal WebSocket class to only accept binary data,
 * which is shuttled to one callback function.
 *
 * @param {string} uid - The uid for the WebSocket.
 * @returns {WebSocket} The created WebSocket.
 */
export class FastWSConnection implements FastConnection {
    static typename: string = "fast";
    uid: string;
    private ws: WebSocket;

    constructor(
        uid: string,
        destructure: (data: ArrayBuffer) => any[],
        step: (...args: any[]) => void,
    ) {
        this.uid = uid;

        this.ws = new WebSocket(getURL(uid, FastWSConnection.typename));
        this.ws.binaryType = "arraybuffer";
        this.ws.onmessage = (event: MessageEvent) => {
            console.assert(typeof event.data === "ArrayBuffer");
            const structure = destructure(event.data);
            step(...structure);
        };
    }
}
