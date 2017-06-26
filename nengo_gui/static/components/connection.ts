import { Component } from "./base";
import { ConnectionView, RecurrentConnectionView } from "./views/connection";

export abstract class ComponentConnection {
    view: ConnectionView | RecurrentConnectionView;

    get visible(): boolean {
        return this.view.visible;
    }

    set visible(val: boolean) {
        this.view.visible = val;
    }

    abstract syncWithComponents();

}

export class FeedforwardConnection extends ComponentConnection {
    readonly pre: Component;
    readonly post: Component;
    view: ConnectionView;

    constructor(pre, post) {
        super();
        console.assert(this.pre !== this.post);
        this.pre = pre;
        this.post = post;
        this.view = new ConnectionView();
        this.syncWithComponents();

        this.pre.interactable.on("dragmove resizemove", () => {
            this.view.startPos = this.pre.view.centerPos;
        });
        this.post.interactable.on("dragmove resizemove", () => {
            this.view.endPos = this.post.view.centerPos;
        });
    }

    syncWithComponents() {
        this.view.startPos = this.pre.view.centerPos;
        this.view.endPos = this.post.view.centerPos;
    }

    // constructor(ng, info, minimap, miniConn) {
        // Flag to indicate this Connection has been deleted
        // this.removed = false;

        // The actual NetGraphItem currently connected to/from
        // this.pre = null;
        // this.post = null;

        // this.minimap = minimap;
        // this.miniConn = miniConn;
        // if (!minimap) {
        //     this.gConns = ng.gConns;
        //     this.objects = ng.svgObjects;
        // } else {
        //     this.gConns = ng.gConnsMini;
        //     this.objects = ng.minimapObjects;
        // }

        // The uids for the pre and post items in the connection.

        // The lists start with the ideal target item, followed by the parent
        // of that item, and its parent, and so on.  If the first item on the
        // this does not exist (due to it being inside a collapsed network),
        // the connection will look for the next item on the list, and so on
        // until it finds one that does exist.
        // this.pres = info.pre;
        // this.posts = info.post;

        // this.recurrent = this.pres[0] === this.posts[0];

        // Figure out the best available items to connect to
        // this.setPre(this.findPre());
        // this.setPost(this.findPost());

        // Determine parent and add to parent's children list
        // if (info.parent === null) {
        //     this.parent = null;
        // } else {
        //     this.parent = this.objects[info.parent];
        //     if (!minimap) {
        //         this.parent.childConnections.push(this);
        //     }
        // }

        // Create the line and its arrowhead marker
        // this.g = ng.createSVGElement("g");

        // this.createLine();

        // this.redraw();

        // this.gConns.appendChild(this.g);
    // }
}

export class RecurrentConnection extends ComponentConnection {
    readonly component: Component;
    view: RecurrentConnectionView;

    constructor(component) {
        super();
        this.component = component;
        this.view = new RecurrentConnectionView();
        this.syncWithComponents();

        this.component.interactable.on(
            "dragmove resizemove", () => this.syncWithComponents()
        );
    }

    syncWithComponents() {
        this.view.width = this.component.view.width * 1.4;
        this.view.pos = this.component.view.centerPos;
    }
}
