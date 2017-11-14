import { Component } from "../components/component";
import {
    ComponentConnection,
    FeedforwardConnection,
    RecurrentConnection
} from "../components/connection";

export class ConnectionManager {
    byComponent: { [uid: string]: Array<ComponentConnection> } = {};
    connections: { [uids: string]: ComponentConnection } = {};

    private static removeFromArray(
        array: Array<ComponentConnection>,
        connection: ComponentConnection
    ) {
        const ix = array.indexOf(connection);
        if (ix > -1) {
            array.splice(ix, 1);
        }
    }

    connect(pre: Component, post: Component) {
        const uids = `${pre.uid}->${post.uid}`;
        if (!(uids in this.connections)) {
            if (!(pre.uid in this.byComponent)) {
                this.byComponent[pre.uid] = [];
            }
            if (!(post.uid in this.byComponent)) {
                this.byComponent[post.uid] = [];
            }

            let connection;
            if (pre === post) {
                connection = new RecurrentConnection(pre);
            } else {
                connection = new FeedforwardConnection(pre, post);
            }
            this.connections[uids] = connection;
            this.byComponent[pre.uid].push(connection);
            this.byComponent[post.uid].push(connection);
        }
        return this.connections[uids];
    }

    disconnect(pre: Component, post: Component) {
        const uids = `${pre.uid}->${post.uid}`;
        if (uids in this.connections) {
            const conn = this.connections[uids];
            delete this.connections[uids];
            ConnectionManager.removeFromArray(this.byComponent[pre.uid], conn);
            ConnectionManager.removeFromArray(this.byComponent[post.uid], conn);
        }
    }

    removeAll(component: Component) {
        this.byComponent[component.uid].forEach(conn => {
            if (conn instanceof FeedforwardConnection) {
                this.disconnect(conn.pre, conn.post);
            } else if (conn instanceof RecurrentConnection) {
                this.disconnect(conn.component, conn.component);
            }
        });
        console.assert(this.byComponent[component.uid].length === 0);
    }

    syncWithComponents() {
        for (const uid in this.connections) {
            this.connections[uid].syncWithComponents();
        }
    }
}
