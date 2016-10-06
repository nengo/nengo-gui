import { Deferred, Promise } from "ts-promise";

import * as utils from "./utils";

const nextID = (() => {
    let lastid = 0;
    return () => {
        lastid += 1;
        return lastid;
    };
})();

function randomID() {
    return Math.floor(Math.random() * 9007199254740992);
}

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

/**
 * Create a WebSocket connection to the given uid.
 *
 * This extends the normal WebSocket class with methods for doing
 * remote procedure calls (RPC), and publish / subscribe (PubSub)
 * over websockets. These are inspired by the WAMP protocol, but do
 * currently conform to the protocol.
 *
 * See also the corresponding methods on the Python side.
 *
 * @param {string} uid - The uid for the WebSocket.
 * @returns {WebSocket} The created WebSocket.
 */
export class Connection {
    // TODO: Add ability to retry?

    onclose: Function = null;
    onopen: Function = null;
    session: Session = null;
    url: string;
    private ws: WebSocket;

    constructor(uid: string, typename: string = "component") {
        this.url = getURL(uid, typename);
    }

    get isConnected(): boolean {
        if (this.session === null) {
            return false;
        }
        return this.session.isOpen;
    }

    open() {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = "arraybuffer";
        if (this.onopen !== null) {
            this.ws.onopen = () => this.onopen();
        }
        if (this.onclose !== null) {
            this.ws.onclose = () => this.onclose();
        }

        this.session = new Session(this.ws);
    }

    close(reason: string, message: string) {
        if (this.session === null) {
            throw "connection already closed";
        }

        this.session.close(reason, message);

        this.session = null;
    }
}

class Session {
    id: number;
    created: number;
    // private toCall: {[uri: string]: Promise<any>};
    private toRegister: {[procedure: string]: DeferredRegistration};
    private toSubscribe: {[topic: string]: DeferredSubscription};
    private ws: WebSocket;
    private _registrations: {[procedure: string]: Registration[]} = {};
    private _subscriptions: {[topic: string]: Subscription[]} = {};

    constructor(websocket: WebSocket) {
        this.ws = websocket;
        this.ws.onmessage = msg => {
            parse(msg.data).dispatch(this);
        };
        this.created = utils.now();
    }

    get isOpen(): boolean {
        return this.ws.readyState === WebSocket.OPEN;
    }

    get registrations(): Registration[] {
        const registrations = [];
        Object.keys(this._registrations).forEach(procedure => {
            registrations.push(this._registrations[procedure]);
        });
        return registrations;
    }

    get subscriptions(): Subscription[] {
        const subscriptions = [];
        Object.keys(this._subscriptions).forEach(topic => {
            subscriptions.push(this._subscriptions[topic]);
        });
        return subscriptions;
    }

    close(reason: string, message: string) {
        // todo
    }

    /* tslint:disable:no-console */
    log(message: string) {
        const elapsed = utils.now() - this.created;
        const header =
            "Session " + this.id + " at " + elapsed.toFixed(3) + " ms";

        if (console.group) {
            console.group(header);
            console.log(message);
            console.groupEnd();
        } else {
            console.log(header + ":");
            console.log("    " + message);
        }
    }
    /* tslint:enable:no-console */

    register(procedure: string, endpoint) {
        if (!this.isOpen) {
            throw "session is not open";
        }

        this.toRegister[procedure] = new DeferredRegistration(endpoint);
        return this.toRegister[procedure].promise;
    }

    unregister(registration: Registration) {
        ;
    }

    call(procedure, args, kwargs) {
        return ;
    }

    subscribe(topic: string, handler) {
        if (!this.isOpen) {
            throw "session is not open";
        }

        this.toSubscribe[topic] = new DeferredSubscription(handler);
        return this.toSubscribe[topic].promise;
    }

    unsubscribe(subscription: Subscription) {
        ;
    }

    publish(topic: string, args, kwargs) {
        ;
    }

}

/**
 * Types of messages
 * -----------------
 */
const msgtypes = {
    subscribe: Subscribe,
};

/**
 * Parses strings sent to the websocket.
 *
 * Message format
 * --------------
 *
 * The message is a JSON string that will be parsed into an array.
 * The characteristics of the array determine what type of message
 * is being sent, and therefore the return value.
 *
 */
function parse(data: string): Message {
    const msg = JSON.parse(data);
    return new msgtypes[msg[0]](...msg.slice(1));
}

interface Message {
    dispatch(session: Session);
}

class Subscribe implements Message {
    id: number;
    topic: string;

    constructor(id: number, topic: string) {
        this.id = id;
        this.topic = topic;
    }

    dispatch(session: Session) {

    }
}

class DeferredRegistration implements Deferred<Registration> {
    endpoint: (args: any[], kwargs: any) => any;
    reject: (reason: Error) => void;
    resolve: (value: Registration) => void;
    promise: Promise<Registration>;

    constructor(endpoint: (args: any[], kwargs: any) => any) {
        this.endpoint = endpoint;
        this.promise = new Promise<Registration>((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

class DeferredSubscription implements Deferred<Subscription> {
    handler: (args: any[], kwargs: any) => any;
    reject: (reason: Error) => void;
    resolve: (value: Subscription) => void;
    promise: Promise<Subscription>;

    constructor(handler: (args: any[], kwargs: any) => any) {
        this.handler = handler;
        this.promise = new Promise<Subscription>((resolve, reject) => {
            this.reject = reject;
            this.resolve = resolve;
        });
    }
}

class Registration {
    id: number;
    endpoint: (args: any[], kwargs: any) => any;
    procedure;
    session: Session;

    constructor(id: number, endpoint, procedure, options, session) {
        this.id = id;
        this.endpoint = endpoint;
        this.procedure = procedure;
        this.session = session;
    }

    unregister() {
        this.session.unregister(this);
    }
}

class Subscription {
    id: number;
    handler: (args: any[], kwargs: any) => any;
    session: Session;
    topic: string;

    constructor(id: number, handler, options, session, topic) {
        this.id = id;
        this.handler = handler;
        this.session = session;
        this.topic = topic;
    }

    unsubscribe() {
        this.session.unsubscribe(this);
    }

}

export class DataConnection {
    // TODO: Add ability to retry?

    onclose: Function = null;
    onopen: Function = null;
    session: Session = null;
    url: string;
    private ws: WebSocket;

    constructor(uid: string, typename: string = "component") {
        this.url = getURL(uid, typename);
    }

    get isConnected(): boolean {
        if (this.session === null) {
            return false;
        }
        return this.session.isOpen;
    }

    open() {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = "arraybuffer";
        if (this.onopen !== null) {
            this.ws.onopen = () => this.onopen();
        }
        if (this.onclose !== null) {
            this.ws.onclose = () => this.onclose();
        }

        this.session = new Session(this.ws);
    }

    close(reason: string, message: string) {
        if (this.session === null) {
            throw "connection already closed";
        }

        this.session.close(reason, message);

        this.session = null;
    }
}
