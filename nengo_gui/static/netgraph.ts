/**
 * Network diagram.
 *
 * @constructor
 * @param {DOMElement} parent - the element to add this component to
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 *
 * NetGraph constructor is written into HTML file from the python
 * server and is run on page load.
 */

import * as interact from "interact.js";

import { config } from "./config";
import { HotkeyManager } from "./hotkeys";
import { Menu } from "./menu";
import * as utils from "./utils";
import { Connection } from "./websocket";
import { Component, ResizableComponent, Widget } from "./components/base";
import {
    ComponentConnection, FeedforwardConnection, RecurrentConnection
} from "./components/connection";
import { Network } from "./components/network";
import { Value } from "./components/value";
import { NetGraphView } from "./views/netgraph";


export class Action {
    apply: () => void;
    undo: () => void;

    constructor(apply: () => void, undo: () => void) {
        this.apply = apply;
        this.undo = undo;
    }
}

export class ActionStack {
    actions: Action[] = [];
    index: number = -1;

    get canUndo(): boolean {
        return this.index >= 0;
    }

    get canRedo(): boolean {
        return (this.index + 1) < this.actions.length;
    }

    get lastAction(): Action {
        return this.actions[this.index];
    }

    apply(func: () => void, undo: () => void) {
        func();
        this.actions.push(new Action(func, undo));
        this.index += 1;
    }

    redo() {
        console.assert(this.canRedo);
        this.index += 1;
        this.actions[this.index].apply();
    }

    undo() {
        console.assert(this.canUndo);
        this.actions[this.index].undo();
        this.index -= 1;
    }
}

export class ConnectionManager {
    byComponent: {[uid: string]: ComponentConnection[]} = {};
    connections: {[uids: string]: ComponentConnection} = {};

    private static removeFromArray(
        array: ComponentConnection[],
        connection: ComponentConnection,
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
        this.byComponent[component.uid].forEach((conn) => {
            if (conn instanceof FeedforwardConnection) {
                this.disconnect(conn.pre, conn.post);
            } else if (conn instanceof RecurrentConnection) {
                this.disconnect(conn.component, conn.component);
            }
        });
        console.assert(this.byComponent[component.uid].length === 0);
    }
}

export class ComponentManager {
    components: Component[] = [];
    networks: {[uid: string]: Network} = {};
    widgets: Widget[] = [];

    get length(): number {
        return this.components.length;
    }

    add(component: Component, network: Network = null) {
        this.components.push(component);
        this.networks[component.uid] = network;
        if (component instanceof Widget) {
            this.widgets.push(component);
        }
    }

    onresize = utils.throttle((widthScale: number, heightScale: number): void => {
        // for (const uid in this.components) {
        //     const component = this.components[uid];
        //     // TODO: Set component scaleToPixels
        //     // component.onresize(
        //     //     component.width * widthScale, component.height * heightScale,
        //     // );
        // }
    }, 66);

    remove(component: Component) {
        // First, remove all children ???
        const index = this.components.indexOf(component);
        this.components.splice(index, 1);
    }

    saveLayouts() {
        this.components.forEach((component) => {
            // TODO: layout?
            // component.saveLayout();
        });
    }

    toCSV(): string {
        const data = [];
        const csv = [];

        // Extract all the data from the value components
        this.widgets.forEach((widget) => {
            data.push(widget.datastore.data);
        });

        // Grabs all the time steps
        const times = this.widgets[0].datastore.times;

        // Headers for the csv file
        csv.push(["Graph Name"]);
        csv.push(["Times"]);

        // Adds ensemble name and appropriate number of spaces to the header
        this.widgets.forEach((value, i) => {
            csv[0].push(value.uid);
            data[i].forEach(() => {
                csv[0].push([]);
            });
        });

        data.forEach((dims) => {
            dims.forEach((dim, i) => {
                csv[1].push(`Dimension ${i + 1}`);
            });
        });

        // Puts the data at each time step into a row in the csv
        times.forEach((time, timeIx) => {
            const row = [time];
            data.forEach((dims, dimsIx) => {
                dims.forEach((dim, dimIx) => {
                    row.push(data[dimsIx][dimIx][timeIx]);
                });
            });
            csv.push(row);
        });

        // Turns the array into a CSV string
        csv.forEach((elem, i) => {
            csv[i] = elem.join(",");
        });
        return csv.join("\n");
    }
}

class NetManager {

    collapse(network: Network, reportToServer, auto = false) {
        this.gClass.pop();

        // Remove child NetGraphItems and NetGraphConnections
        while (this.childConnections.length > 0) {
            this.childConnections[0].remove();
        }
        while (this.children.length > 0) {
            this.children[0].remove();
        }

        if (this.expanded) {
            this.expanded = false;
            // if (this.ng.transparentNets) {
            //     this.view.transparentShape(false);
            // }
            // this.gNetworks.removeChild(this.view.g);
            // this.ng.view.gItems.appendChild(this.view.g);
            // if (!this.minimap) {
            //     this.miniItem.collapse(reportToServer, auto);
            // }
        } else {
            console.warn(
                "collapsed a network that was already collapsed: " + this);
        }

        if (reportToServer) {
            // if (auto) {
            //     // Update the server, but do not place on the undo stack
            //     this.ng.notify("autoCollapse", {uid: this.uid});
            // } else {
            //     this.ng.notify("collapse", {uid: this.uid});
            // }
        }
    }

        expand(network: Network, returnToServer = true, auto = false) {
        // Default to true if no parameter is specified
        if (typeof returnToServer !== "undefined") {
            returnToServer = true;
        }
        auto = typeof auto !== "undefined" ? auto : false;

        if (!this.expanded) {
            this.expanded = true;
            this.gClass.push("expanded");

            // if (this.ng.transparentNets) {
            //     this.view.transparentShape(false);
            // }
            // this.ng.view.gItems.removeChild(this.view.g);
            // this.gNetworks.appendChild(this.view.g);
            if (!this.minimap) {
                this.miniItem.expand(returnToServer, auto);
            }
        } else {
            console.warn(
                "expanded a network that was already expanded: " + this);
        }

        if (returnToServer) {
            // if (auto) {
            //     // Update the server, but do not place on the undo stack
            //     this.ng.notify("autoExpand", {uid: this.uid});
            // } else {
            //     this.ng.notify("expand", {uid: this.uid});
            // }
        }
    }
}

export class NetGraph {

    actions: ActionStack = new ActionStack();
    components: ComponentManager = new ComponentManager();
    connections: ConnectionManager = new ConnectionManager();
    interactable;
    widgets: Widget[];

    /**
     * Since connections may go to items that do not exist yet (since they
     * are inside a collapsed network), this dictionary keeps a list of
     * connections to be notified when a particular item appears.  The
     * key in the dictionary is the uid of the nonexistent item, and the
     * value is a list of NetGraphConnections that should be notified
     * when that item appears.
     */
    // ConnDict
    collapsedConns: any = {};
    gConnsMini: SVGElement;
    gItemsMini: SVGElement;
    gNetworksMini: SVGElement;
    inZoomDelay;

    menu: Menu;
    minimap;

    // Global x,y pan offset
    offsetX: number = 0;
    offsetY: number = 0;

    // ConnDict
    svgConns: any = {};
    // SvgObjecs
    svgObjects: any = {net: {}, ens: {}, node: {}, passthrough: {}};
    uid: string;
    view: NetGraphView;

    private attached: Connection[] = [];

    private _scale: number = 1;

    constructor(uid: string) {
        this.uid = uid;

        // TODO: greatly improve this validation
        // where is uid defined?
        if (uid[0] === "<") {
            console.warn("invalid uid for NetGraph: " + uid);
        }

        // this.minimap = new Minimap();
        this.view = new NetGraphView();
        this.view.fontSize = this.fontSize;
        this.view.scale = this.scale;
        this.view.zoomFonts = this.zoomFonts;

        // Set up interactivity
        this.interactable = interact(this.view.root);
        this.interactable.styleCursor(false)
        this.interactable.draggable(true);

        // Dragging the background pans the full area by changing offsetX,Y
        // Define cursor behaviour for background
        // TODO: Is this really what we want?? Doesn't interact do this already?
        this.interactable.on("mousedown", () => {
            const cursor = document.documentElement.style.cursor;
            // Don't change resize cursor
            if (!utils.endsWith(cursor, "resize")) {
                document.documentElement.style.cursor = "move";
            }
        });
        this.interactable.on("mouseup", () => {
            document.documentElement.style.cursor = "default";
        });
        this.interactable.on("dragend", (event) => {
            // Update internal state of components
            this.components.components.forEach((component) => {
                component.syncWithView();
            });
        });
        this.interactable.on("dragmove", (event) => {
            console.assert(this.scaledWidth !== 0);
            console.assert(this.scaledHeight !== 0);
            this.offsetX += event.dx / this.scaledWidth;
            this.offsetY += event.dy / this.scaledHeight;

            this.components.components.forEach((component) => {
                const [left, top] = component.view.pos;
                component.view.pos = [left + event.dx, top + event.dy];
            });

            for (const uid in this.connections.connections) {
                this.connections.connections[uid].syncWithComponents();
            }
        });
        this.interactable.on("dragstart", () => {
            Menu.hideShown();
        });
        this.interactable.on("wheel", (event) => {
            event.preventDefault();

            Menu.hideShown();

            const x = (event.clientX) / this.view.width;
            const y = (event.clientY) / this.view.height;

            let delta;

            if (event.deltaMode === 1) {
                // DOMDELTALINE
                if (event.deltaY !== 0) {
                    delta = Math.log(1. + Math.abs(event.deltaY)) * 60;
                    if (event.deltaY < 0) {
                        delta *= -1;
                    }
                } else {
                    delta = 0;
                }
            } else if (event.deltaMode === 2) {
                // DOMDELTAPAGE
                // No idea what device would generate scrolling by a page
                delta = 0;
            } else {
                // DOMDELTAPIXEL
                delta = event.deltaY;
            }

            let zScale = 1. + Math.abs(delta) / 600.;
            if (delta > 0) {
                zScale = 1. / zScale;
            }

            this.components.saveLayouts();

            const xx = x / this.scale - this.offsetX;
            const yy = y / this.scale - this.offsetY;
            this.offsetX = (this.offsetX + xx) / zScale - xx;
            this.offsetY = (this.offsetY + yy) / zScale - yy;

            this.scale = zScale * this.scale;

            // this.scaleMiniMapViewBox();

            this.redraw();

            // Let the server know what happened
            this.attached.forEach((conn) => {
                conn.send("netgraph.zoom",
                          {scale: this.scale, x: this.offsetX, y: this.offsetY});
            });
        });
        //this.interactable.on("click", (event) => {
        //     document.querySelector(".aceText-input")
        //         .dispatchEvent(new Event("blur"));
        // })
        // Scrollwheel on background zooms the full area by changing scale.
        // Note that offsetX,Y are also changed to zoom into a particular
        // point in the space

        // Determine when to pull up the menu
        this.interactable.on("hold", (event) => { // Change to "tap" for right click
            if (event.button === 0) {
                if (Menu.shown !== null) {
                    Menu.hideShown();
                } else {
                    this.menu.show(event.clientX, event.clientY);
                }
                event.stopPropagation();
            }
        });
        this.interactable.on("tap", (event) => { // Get rid of menus when clicking off
            if (event.button === 0) {
                Menu.hideShown();
            }
        });

        this.view.root.addEventListener("contextmenu", (event: MouseEvent) => {
            event.preventDefault();
            if (Menu.shown !== null) {
                Menu.hideShown();
            } else {
                this.menu.show(event.clientX, event.clientY);
            }
        });

        // Respond to resize events
        window.addEventListener("resize", (event) => this.onresize(event));

        // this.createMinimap();
        this.menu = new Menu();
        this.addMenuItems();
    }

    get aspectResize(): boolean {
        return config.aspectResize;
    }

    set aspectResize(val) {
        if (val === this.aspectResize) {
            return;
        }
        config.aspectResize = val;
    }

    get pixelHeight(): number {
        return this.view.height;
    }

    get pixelWidth(): number {
        return this.view.width;
    }

    get rect(): utils.Rect {
        return new utils.Rect({
            bottom: this.offsetY + this.scaledHeight,
            left: this.offsetX,
            right: this.offsetX + this.scaledWidth,
            top: this.offsetY,
        });
    }

    // TODO: which one tho, this or rect
    // _getNetGraphDims() {
    //     const w = this.ng.scaledWidth;
    //     const h = this.ng.scaledHeight;
    //     const offsetX = this.ng.offsetX * w;
    //     const offsetY = this.ng.offsetY * h;
    //     console.assert(!isNaN(offsetX));
    //     console.assert(!isNaN(offsetY));
    //     return {w, h, offsetX, offsetY};
    // }

    get fontSize(): number {
        return config.fontSize;
    }

    set fontSize(val: number) {
        if (val === this.fontSize) {
            return;
        }
        config.fontSize = val;
    }

    /**
     * Pan the screen (and redraw accordingly)
     */
    set offset({x, y}) {
        this.offsetX = x;
        this.offsetY = y;
        this.redraw();
    }

    get scale(): number {
        return this._scale;
    }

    set scale(val: number) {
        if (val === this._scale) {
            return;
        }
        this.view.scale = val;
        this._scale = val;
        this.redraw();
    }

    /**
     * Return the pixel height of the SVG times the current scale factor.
     */
    get scaledHeight() {
        console.assert(this.view.height !== 0);
        console.assert(this.scale !== 0);
        return this.view.height * this.scale;
    }

    /**
     * Return the pixel width of the SVG times the current scale factor.
     */
    get scaledWidth() {
        console.assert(this.view.width !== 0);
        console.assert(this.scale !== 0);
        return this.view.width * this.scale;
    }

    get transparentNets(): boolean {
        return config.transparentNets;
    }

    set transparentNets(val: boolean) {
        if (val === config.transparentNets) {
            return;
        }
        config.transparentNets = val;
        this.components.components.forEach(component => {
            if (component instanceof Network) {
                component.transparent = val;
            }
        });
    }

    get zoomFonts(): boolean {
        return config.zoomFonts;
    }

    set zoomFonts(val: boolean) {
        if (val === config.zoomFonts) {
            return;
        }
        config.zoomFonts = val;
    }

    private viewGroup(component: Component) {
        if (component instanceof Widget) {
            return this.view.widgets;
        } else if (component instanceof Network) {
            return this.view.networks;
        } else {
            return this.view.items;
        }
    }

    add(component: Component, network: Network = null) {
        const group = this.viewGroup(component);
        this.components.add(component, network);
        if (network != null) {
            component.onnetadd(network);
        }
        group.appendChild(component.view.root);
        component.ondomadd();

        // -- Move element to top when clicked on
        const raiseToTop = () => {
            // In SVG, z-order is based on element location, so to raise
            // to the top we re-add the element.
            // The DOM automatically removes element that get added twice.
            group.appendChild(component.view.root);
        };
        component.view.root.addEventListener("mousedown", raiseToTop);
        component.view.root.addEventListener("touchstart", raiseToTop);

        // -- Record moves and resizes
        this.interactable.on("dragend resizeend", (event) => {
            // const info = {
            //     height: this.h,
            //     labelVisible: this.labelVisible,
            //     width: this.w,
            //     x: this.x,
            //     y: this.y,
            // };
            // this.ws.send("config:" + JSON.stringify(info));
        });
    }

    addMenuItems() {
        this.menu.addAction("Auto-layout", () => {
            this.attached.forEach((conn) => {
                conn.send("netgraph.feedforwardLayout");
            });
        });
    }

    /**
     * Event handler for received WebSocket messages
     */
    attach(conn: Connection) {

        // TODO: bind a connection for the creation of each object
        // Node-only first so that I can get something I can test
        conn.bind("netGraph.createNode", (
            {ngiArg, interArg, dimensions, html}: {
                ngiArg: any, // NetGraphItemArg,
            interArg: any, // : InteractableItemArg,
            dimensions: number, html: string}) => {
                this.createNode(ngiArg, interArg, dimensions, html);
        });

        conn.bind("netGraph.createConnection", ({connArg}) => {
            this.createConnection(connArg);
        });

        // there should probably be a coordinate data type
        conn.bind("netGraph.pan", ({x, y}: Pos) => {
            this.offset = {x, y};
        });

        conn.bind("netGraph.zoom", ({zoom}: {zoom: number}) => {
            this.scale = zoom;
        });

        // TODO: How much error checking are we supposed to do?
        // Should I check that the uid gives a network or do I just
        // let it throw an error?
        // Or should I make a seperate list of interactables
        conn.bind("netGraph.expand", ({uid}: {uid: string}) => {
            const item = this.svgObjects.net[uid];
            item.expand(true, true);
        });
        conn.bind("netGraph.collapse", ({uid}: {uid: string}) => {
            const item = this.svgObjects.net[uid];
            item.expand(true, true);
        });

        // Should probably make a shape param too
        conn.bind("netGraph.posSize", (
            {uid, x, y, width, height}: {uid: string} & Pos & utils.Shape) => {
                const item = this.svgObjects[uid];
                item.x = x;
                item.y = y;
                item.width = width;
                item.height = height;

                item.redraw();

                // this.scaleMiniMap();
        });

        conn.bind("netGraph.config", ({uid, config}: {uid: string} & {config: any}) => {
            // Anything about the config of a component has changed
            const component = this.components[uid];
            component.updateLayout(config);
        });

        conn.bind("netGraph.js", ({js: js}) => {
            // TODO: noooooooo
            eval(js);
        });

        conn.bind("netGraph.rename", (
            {uid, newName}: {uid: string} & {newName: string}) => {
                const item = this.svgObjects[uid];
                item.setLabel(newName);
        });

        conn.bind("netGraph.remove", ({uid}) => {
            // TODO: this feels hacky
            // (which is why TypeScript is complaining)
            let item = this.svgObjects[uid];
            if (item === undefined) {
                item = this.svgConns[uid];
            }

            item.remove();
        });

        conn.bind("netGraph.reconnect",
                  ({uid, pres, posts}: {uid: string} & any & any) => {
                const netConn = this.svgConns[uid];
                netConn.setPres(pres);
                netConn.setPosts(posts);
                netConn.setRecurrent(pres[0] === posts[0]);
                netConn.redraw();
        });

        conn.bind("netGraph.reconnect", ({uid, notifyServer}: {uid: string} & any) => {
            const component = this.components[uid];
            // component.remove(true, notifyServer);
        });

        this.attached.push(conn);
    }


    connect(pre: Component, post: Component) {
        const connection = this.components.connect(pre, post);
        this.view.conns.appendChild(connection.view.root);
        // TODO: update positions without having to move
    }

    // this will need to be refactored later
    createNode(ngiArg, interArg, dimensions, html) {
        // TODO: fill in the rest of the args
        const item = new NodeItem(ngiArg, interArg, dimensions, html);
        this.svgObjects.node[ngiArg.uid] = item;

        this.detectCollapsedConns(item.uid);
    }

    /**
     * Create a new NetGraphConnection.
     */
    createConnection(info) {
        const connMini = new NetGraphConnection(this, info, true, null);
        this.svgConns[info.uid] = new NetGraphConnection(
            this, info, false, connMini);
    }

    /**
     * Manage collapsedConns dictionary.
     *
     * If a NetGraphConnection is looking for an item with a particular uid,
     * but that item does not exist yet (due to it being inside a collapsed
     * network), then it is added to the collapsedConns dictionary. When
     * an item is created, this function is used to see if any
     * NetGraphConnections are waiting for it, and notifies them.
     */
    detectCollapsedConns(uid) {
        const conns = this.collapsedConns[uid];
        if (conns !== undefined) {
            delete this.collapsedConns[uid];
            for (let i = 0; i < conns.length; i++) {
                const conn = conns[i];
                // Make sure the NetGraphConnection hasn't been removed since
                // it started listening.
                if (!conn.removed) {
                    conn.setPre(conn.findPre());
                    conn.setPost(conn.findPost());
                    conn.redraw();
                }
            }
        }
    }

    hotkeys(manager: HotkeyManager) {
        manager.add("Undo", "z", {ctrl: true}, () => {
            this.notify("undo", "1");
        });
        manager.add("Redo", "z", {ctrl: true, shift: true}, () => {
            this.notify("undo", "0");
        });
        manager.add("Redo", "y", {ctrl: true}, () => {
            this.notify("undo", "0");
        });
        manager.add("Toggle minimap", "m", {ctrl: true}, () => {
            this.minimap.toggle();
        });
    }

    // notify(eventName, eventArg) {
    //     this.attached.forEach((conn) => {
    //         conn.send("netgraph." + eventName,
    //             {x: this.offsetX, y: this.offsetY});
    //     });
    // }

    /**
     * Handler for resizing the full SVG.
     */
    onresize = utils.throttle((event) => {
        const width = this.view.width;
        const height = this.view.height;
        console.assert(width !== 0);
        console.assert(height !== 0);

        if (this.aspectResize) {
            Object.keys(this.svgObjects).forEach((objType) => {
                Object.keys(this.svgObjects[objType]).forEach((key) => {
                    const item = this.svgObjects[objType][key];
                    // TODO: this is the only thing ViewPort is being used for,
                    // so it can probably be removed
                    if (item.depth === 1) {
                        const newWidth =
                            this.viewPort.scaleWidth(item.width) / this.scale;
                        const newHeight =
                            this.viewPort.scaleHeight(item.height) / this.scale;
                        item.width = newWidth / (2 * width);
                        item.height = newHeight / (2 * height);
                    }
                });
            });
        }

        // this.mmWidth = $(this.minimap).width();
        // this.mmHeight = $(this.minimap).height();

        this.redraw();
        this.components.onresize(event);
    }, 66);

    /**
     * Redraw all elements
     */
    redraw() {
        Object.keys(this.svgObjects).forEach((objType) => {
            Object.keys(this.svgObjects[objType]).forEach((key) => {
                    this.svgObjects[objType][key].redraw();
            });
        });
        Object.keys(this.svgConns).forEach((key) => {
            this.svgConns[key].redraw();
        });
    }

    /**
     * Register a NetGraphConnection with a target item that it is looking for.
     *
     * This is a NetGraphItem that does not exist yet, because it is inside a
     * collapsed network. When it does appear, NetGraph.detectCollapsed will
     * handle notifying the NetGraphConnection.
     */
    registerConn(conn, target) {
        if (this.collapsedConns[target] === undefined) {
            this.collapsedConns[target] = [conn];
        } else {
            const index = this.collapsedConns[target].indexOf(conn);
            if (index === -1) {
                this.collapsedConns[target].push(conn);
            }
        }
    }

    remove(component: Component, undoFlag = false, notifyServer = true) {
        // TODO: unduplicate from add
        let group: SVGElement = this.view.root;
        if (component instanceof Widget) {
            group = this.view.widgets;
        } else {
            group = this.view.items;
            this.components.remove(component);
        }

        group.removeChild(component.view.root);

        // Call collapse on networks...?

        // --- from NetGraphItemView
        // this.gItems.removeChild(this.g);

        // --- from Component

        // if (notifyServer) {
        //     if (undoFlag) {
        //         // this.ws.send("removeUndo");
        //     } else {
        //         // this.ws.send("remove");
        //     }
        // }
        // this.parent.removeChild(this.view.root);
        // allComponents.remove(this);

        // --- from NetGraphItem

        // delete this.ng.svgObjects[this.uid];

        // Update any connections into or out of this item
        // const connIn = this.connIn.slice();
        // for (const conn of connIn) {
        //     conn.setPost(conn.findPost());
        //     conn.redraw();
        // }
        // const connOut = this.connOut.slice();
        // for (const conn of connOut) {
        //     conn.setPre(conn.findPre());
        //     conn.redraw();
        // }

        // Remove from the SVG
        // this.view.remove();
        // if (this.view.depth === 1) {
        //     this.ng.scaleMiniMap();
        // }
    }
}
