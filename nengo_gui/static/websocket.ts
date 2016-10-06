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

type Callback = (kwargs: any) => any;

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
export class Connection extends WebSocket {
    private callbacks: {[name: string]: Callback[]};

    constructor(uid: string, typename: string = "component") {
        super(getURL(uid, typename));
        this.onmessage = (event: MessageEvent) => {
            const json = JSON.parse(event.data);
            this.dispatch(json[0], json[1]);
        };

        this.onclose = () => {
            this.dispatch("close");
        };

        this.onopen = () => {
            this.dispatch("open");
        };
    }

    bind(name: string, callback: Callback) {
        if (!(name in this.callbacks)) {
            this.callbacks[name] = [];
        }
        this.callbacks[name].push(callback);
        return this;
    }

    dispatch(name: string, data: any = {}) {
        if (name in this.callbacks) {
            this.callbacks[name].forEach(callback => {
                callback(data);
            });
        } else {
            console.warn("Nothing bound for '" + name + "'");
        }
        return this;
    }

    send(name: string, kwargs: any = {}) {
        const payload = JSON.stringify([name, kwargs]);
        super.send(payload);
        return this;
    }
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
export class FastConnection extends WebSocket {

    // function to parse out / organize / structure data; e.g
    // new Float32Array(event.data)

    // function that will be called with the spread out results of parsed out data
    // (time, speed, proportion => this. ....

    constructor(uid: string, typename: string = "component") {
        super(getURL(uid, typename));
        this.binaryType = "arraybuffer";
        this.onmessage = (event: MessageEvent) => {
            const json = JSON.parse(event.data);
            this.dispatch(json[0], json[1]);
        };
    }
}
