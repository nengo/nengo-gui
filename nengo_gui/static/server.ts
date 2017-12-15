function getURL(fast: boolean = false, uid: string = null): string {
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

    if (fast) {
        url += "/fast";
    } else {
        url += "/";
    }

    if (uid != null) {
        // If requesting UID, only send along UID
        url += `?uid=${uid}`;
    } else if (!fast) {
        // If not requesting UID, send along query params
        const href = window.location.href.split("?");
        if (href.length > 1) {
            url += `?${href[1].replace("#", "")}`;
        }
    }
    return url;
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
    uid: string;
    bind(step: (data: ArrayBuffer) => void);
    send(data: ArrayBuffer);
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
    uid: string;

    private destructure: (data: ArrayBuffer) => any[] = null;
    private step: (...args: any[]) => void = null;
    private ws: WebSocket;

    constructor(uid: string = null) {
        this.uid = uid;

        this.ws = new WebSocket(getURL(true, this.uid));
        this.ws.binaryType = "arraybuffer";
        this.ws.onmessage = (event: MessageEvent) => {
            if (!(event.data instanceof ArrayBuffer)) {
                console.warn(
                    `Received non-binary data for '${this.uid}': ${event.data}`
                );
            } else if (this.step != null) {
                this.step(event.data);
            } else {
                console.warn(`Nothing bound for '${this.uid}'`);
            }
        };
    }

    bind(step: (data: ArrayBuffer) => void) {
        this.step = step;
    }

    send(data: ArrayBuffer) {
        this.ws.send(data);
    }
}

export class MockFastConnection implements FastConnection {
    sentLast: ArrayBuffer;
    sentHistory: ArrayBuffer[] = [];
    uid: string;
    private step: (...args: any[]) => void = null;
    constructor(uid: string = null) {
        this.uid = uid;
    }
    bind(step: (data: ArrayBuffer) => void) {
        this.step = step;
    }
    send(data: ArrayBuffer) {
        this.sentLast = data;
        this.sentHistory.push(data);
    }
}
