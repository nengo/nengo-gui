function getURL(uid: string = null): string {
    const hostname = window.location.hostname;
    const port = window.location.port;
    let wsProto;
    if (window.location.protocol === "https:") {
        wsProto = "wss:";
    } else {
        wsProto = "ws:";
    }
    let url = `${wsProto}//${hostname}`;
    if (port != "") {
        url += `:${port}`;
    }
    if (uid != null) {
        url += `/?uid=${uid}`;
    }
    return url
}

export interface Connection {
    bind(name: string, callback: (kwargs: any) => any): Connection;
    isBound(name: string): boolean;
    dispatch(name: string, kwargs?: any): Connection;
    send(name: string, kwargs?: any): Connection;
}

/**
 * Create a WebSocket connection to the server.
 *
 * This extends the normal WebSocket class with convenience methods
 * for binding and dispatching events to and from other clients
 * connected to the same websocket.
 *
 * @param {string} uid - The uid for the WebSocket.
 * @returns {WebSocket} The created WebSocket.
 */
export class ServerConnection implements Connection {
    typename: string;
    uid: string;

    private callbacks: { [name: string]: ((kwargs: any) => any)[] } = {};
    private ws: WebSocket;

    constructor() {
        this.ws = new WebSocket(getURL());
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

    bind(name: string, callback: (any) => any): ServerConnection {
        if (!(name in this.callbacks)) {
            this.callbacks[name] = [];
        }
        this.callbacks[name].push(callback);
        return this;
    }

    close() {
        this.ws.close();
    }

    isBound(name: string) {
        return name in this.callbacks;
    }

    isReady() {
        return this.ws.readyState === WebSocket.OPEN;
    }

    dispatch(name: string, kwargs: any = {}): ServerConnection {
        if (name in this.callbacks) {
            this.callbacks[name].forEach(callback => {
                callback(kwargs);
            });
        } else {
            console.warn(`Nothing bound for '${name}'`);
        }
        return this;
    }

    send(name: string, kwargs: any = {}): ServerConnection {
        const payload = JSON.stringify([name, kwargs]);
        this.ws.send(payload);
        return this;
    }
}

export class MockConnection implements Connection {
    static verbose: boolean = true;

    lastSentName: string;
    lastSent: any;

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
export class FastServerConnection implements FastConnection {
    static typename: string = "fast";
    uid: string;
    private ws: WebSocket;

    constructor(
        uid: string,
        destructure: (data: ArrayBuffer) => any[],
        step: (...args: any[]) => void
    ) {
        this.uid = uid;

        this.ws = new WebSocket(getURL(this.uid));
        this.ws.binaryType = "arraybuffer";
        this.ws.onmessage = (event: MessageEvent) => {
            console.assert(event.data instanceof ArrayBuffer);
            const structure = destructure(event.data);
            step(...structure);
        };
    }
}
