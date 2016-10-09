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

    bind(name: string, callback: (any) => any): Connection;
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

    private callbacks: {[name: string]: ((any) => any)[]};
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

    // function to parse out / organize / structure data; e.g
    // new Float32Array(event.data)

    // function that will be called with the spread out results of parsed out data
    // (time, speed, proportion => this. ....

    typename: string;
    uid: string;

    private ws: WebSocket;

    constructor(uid: string, typename: string = "component") {
        this.uid = uid;
        this.typename = typename;

        this.ws = new WebSocket(getURL(uid, typename));
        this.ws.binaryType = "arraybuffer";
        this.ws.onmessage = (event: MessageEvent) => {
            const json = JSON.parse(event.data);
            // this.dispatch(json[0], json[1]);
        };
    }
}
