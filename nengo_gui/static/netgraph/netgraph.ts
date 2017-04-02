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

import { AllComponents } from "../components/all-components";
import { config } from "../config";
import { HotkeyManager } from "../hotkeys";
import { Menu } from "../menu";
import { Shape } from "../utils";
import { ViewPort } from "../viewport";
import { Connection } from "../websocket";
import { NetGraphConnection } from "./connection";
import { NetGraphView } from "./views/netgraph";
// import { Minimap } from "./minimap";

import { InteractableItemArg, PassthroughItem } from "./items/interactable";
import { NetGraphItem, NetGraphItemArg } from "./items/item";
import { EnsembleItem, NetItem, NodeItem} from "./items/resizable";

interface NetDict {
    [uid: string]: NetItem;
}

interface EnsDict {
    [uid: string]: EnsembleItem;
}

interface NodeDict {
    [uid: string]: NodeItem;
}

interface PassthroughDict {
    [uid: string]: PassthroughItem;
}

export interface SvgObjects {
    net: NetDict;
    ens: EnsDict;
    node: NodeDict;
    passthrough: PassthroughDict;
}

interface ConnDict {
    [uid: string]: NetGraphConnection;
}

interface Uid {
    uid: string;
}

interface Pos {
    x: number;
    y: number;
}

// TODO: figure out how to break out the minimap from this class

export class NetGraph {

    allComponents: AllComponents;
    /**
     * Since connections may go to items that do not exist yet (since they
     * are inside a collapsed network), this dictionary keeps a list of
     * connections to be notified when a particular item appears.  The
     * key in the dictionary is the uid of the nonexistent item, and the
     * value is a list of NetGraphConnections that should be notified
     * when that item appears.
     */
    collapsedConns: ConnDict = {};
    gConnsMini: SVGElement;
    gItemsMini: SVGElement;
    gNetworksMini: SVGElement;
    inZoomDelay;
    menu: Menu;
    minimap;

    // Global x,y pan offset
    offsetX: number = 0;
    offsetY: number = 0;

    svgConns: ConnDict = {};
    svgObjects: SvgObjects = {net: {}, ens: {}, node: {}, passthrough: {}};
    uid: string;
    viewPort: ViewPort; // WHAT DOES THIS DO?
    view: NetGraphView;
    transparentNets: boolean;

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
        this.view = new NetGraphView(uid);

        this.viewPort = new ViewPort(this);
        this.allComponents = new AllComponents();

        interact(this.view.root).styleCursor(false);

        // Dragging the background pans the full area by changing offsetX,Y
        // Define cursor behaviour for background
        interact(this.view.root)
            .on("mousedown", () => {
                const cursor = document.documentElement.getAttribute("style");
                if (cursor !== null) {
                    if (cursor.match(/resize/) == null) {
                        // Don't change resize cursor
                        document.documentElement.setAttribute(
                            "style", "cursor:move;");
                    }
                }
            })
            .on("mouseup", () => {
                document.documentElement
                    .setAttribute("style", "cursor:default;");
            })
            .draggable({
                onend: (event) => {
                    // Let the server know what happened
                    this.attached.forEach((conn) => {
                        conn.send("netgraph.pan",
                            {x: this.offsetX, y: this.offsetY});
                    });
                },
                onmove: (event) => {
                    console.assert(this.scaledWidth !== 0);
                    console.assert(this.scaledHeight !== 0);
                    this.offsetX += event.dx / this.scaledWidth;
                    this.offsetY += event.dy / this.scaledHeight;

                    Object.keys(this.svgObjects).forEach((objType) => {
                        Object.keys(this.svgObjects[objType]).forEach((key) => {
                            this.svgObjects[objType][key].view.redrawPosition();
                        // if (this.mmDisplay) {
                        //     this.minimapObjects[key].redrawPosition();
                        // }
                        });
                    });
                    Object.keys(this.svgConns).forEach((key) => {
                        this.svgConns[key].redraw();
                    });

                    this.viewPort.position = {
                        newX: this.offsetX,
                        newY: this.offsetY,
                    };

                    this.scaleMiniMapViewBox();

                },
                onstart: () => {
                    Menu.hideAll();
                },
            })
            // .on("click", (event) => {
            //     document.querySelector(".aceText-input")
            //         .dispatchEvent(new Event("blur"));
            // })
            // Scrollwheel on background zooms the full area by changing scale.
            // Note that offsetX,Y are also changed to zoom into a particular
            // point in the space
            .on("wheel", (event) => {
                event.preventDefault();

                Menu.hideAll();

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

                this.allComponents.saveLayouts();

                const xx = x / this.scale - this.offsetX;
                const yy = y / this.scale - this.offsetY;
                this.offsetX = (this.offsetX + xx) / zScale - xx;
                this.offsetY = (this.offsetY + yy) / zScale - yy;

                this.scale = zScale * this.scale;
                this.viewPort.position = {
                    newX: this.offsetX,
                    newY: this.offsetY,
                };

                this.scaleMiniMapViewBox();

                this.redraw();

                // Let the server know what happened
                this.attached.forEach((conn) => {
                    conn.send("netgraph.zoom",
                        {scale: this.scale, x: this.offsetX, y: this.offsetY});
                });
            });

        this.menu = new Menu(this.view.root);

        this.addMenuItems();

        // Determine when to pull up the menu
        interact(this.view.root)
            .on("hold", (event) => { // Change to "tap" for right click
                if (event.button === 0) {
                    if (Menu.anyVisible()) {
                        Menu.hideAll();
                    } else {
                        this.menu.show(event.clientX, event.clientY);
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", (event) => { // Get rid of menus when clicking off
                if (event.button === 0) {
                    Menu.hideAll();
                }
            });

        this.view.root.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            if (Menu.anyVisible()) {
                Menu.hideAll();
            } else {
                this.menu.show(event.clientX, event.clientY);
            }
        });

        // this.createMinimap();
        this.view.updateFonts(this.zoomFonts, this.fontSize, this._scale);
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

    get fontSize(): number {
        return config.fontSize;
    }

    set fontSize(val: number) {
        if (val === this.fontSize) {
            return;
        }
        config.fontSize = val;
    }

    get scale(): number {
        return this._scale;
    }

    set scale(val: number) {
        if (val === this._scale) {
            return;
        }
        this._scale = val;
        this.view.updateFonts(this.zoomFonts, this.fontSize, this._scale);
        this.redraw();

        this.viewPort.scale = this._scale;
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
            this.toggleMiniMap();
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
     * Return the pixel width of the SVG times the current scale factor.
     */
    get scaledWidth() {
        console.assert(this.view.width !== 0);
        console.assert(this.scale !== 0);
        return this.view.width * this.scale;
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
     * Pan the screen (and redraw accordingly)
     */
    set offset({x, y}: Pos) {
        this.offsetX = x;
        this.offsetY = y;
        this.redraw();

        this.viewPort.position = {newX: x, newY: y};
    }

    /**
     * Event handler for received WebSocket messages
     */
    attach(conn: Connection) {

        // TODO: bind a connection for the creation of each object
        // Node-only first so that I can get something I can test
        conn.bind("netGraph.createNode", (
            {ngiArg, interArg, dimensions, html}: {
            ngiArg: NetGraphItemArg,
            interArg: InteractableItemArg,
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
        conn.bind("netGraph.expand", ({uid}: Uid) => {
            const item = this.svgObjects.net[uid];
            item.expand(true, true);
        });
        conn.bind("netGraph.collapse", ({uid}: Uid) => {
            const item = this.svgObjects.net[uid];
            item.expand(true, true);
        });

        // Should probably make a shape param too
        conn.bind("netGraph.posSize", (
            {uid, x, y, width, height}: Uid & Pos & Shape) => {
                const item = this.svgObjects[uid];
                item.x = x;
                item.y = y;
                item.width = width;
                item.height = height;

                item.redraw();

                this.scaleMiniMap();
        });

        conn.bind("netGraph.config", ({uid, config}: Uid & {config: any}) => {
            // Anything about the config of a component has changed
            const component = this.allComponents.byUID(uid);
            component.updateLayout(config);
        });

        conn.bind("netGraph.js", ({js: js}) => {
            // TODO: noooooooo
            eval(js);
        });

        conn.bind("netGraph.rename", (
            {uid, newName}: Uid & {newName: string}) => {
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
            ({uid, pres, posts}: Uid & any & any) => {
                const netConn = this.svgConns[uid];
                netConn.setPres(pres);
                netConn.setPosts(posts);
                netConn.setRecurrent(pres[0] === posts[0]);
                netConn.redraw();
        });

        conn.bind("netGraph.reconnect",
            ({uid, notifyServer}: Uid & any) => {
                const component = this.allComponents.byUID(uid);
                component.remove(true, notifyServer);
        });

        this.attached.push(conn);
    }

    notify(eventName, eventArg) {
        this.attached.forEach((conn) => {
            conn.send("netgraph." + eventName,
                {x: this.offsetX, y: this.offsetY});
        });
    }

    updateTransparency() {
        const opacity = this.transparentNets ? 0.0 : 1.0;
        Object.keys(this.svgObjects).forEach((key) => {
            const ngi = this.svgObjects[key];
            ngi.computeFill();
            if (ngi.type === "net" && ngi.expanded) {
                ngi.shape.style["fill-opacity"] = opacity;
            }
        });
    }

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
     * Handler for resizing the full SVG.
     */
    onResize(event) {
        const width = this.view.width;
        const height = this.view.height;

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
    }

    /**
     * Expand or collapse a network.
     */
    toggleNetwork({uid}: Uid) {
        const item = this.svgObjects[uid];
        if (item.expanded) {
            item.collapse(true);
        } else {
            item.expand();
        }
    }

    /**
     * Register a NetGraphConnection with a target item that it is looking for.
     *
     * This is a NetGraphItem that does not exist yet, because it is inside a
     * collapsed network. When it does appear, NetGraph.detectCollapsed will
     * handle notifying the NetGraphConnection.
     */
    registerConn(conn, target) {
        // if (this.collapsedConns[target] === undefined) {
        //     this.collapsedConns[target] = [conn];
        // } else {
        //     const index = this.collapsedConns[target].indexOf(conn);
        //     if (index === -1) {
        //         this.collapsedConns[target].push(conn);
        //     }
        // }
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
        // const conns = this.collapsedConns[uid];
        // if (conns !== undefined) {
        //     delete this.collapsedConns[uid];
        //     for (let i = 0; i < conns.length; i++) {
        //         const conn = conns[i];
        //         // Make sure the NetGraphConnection hasn't been removed since
        //         // it started listening.
        //         if (!conn.removed) {
        //             conn.setPre(conn.findPre());
        //             conn.setPost(conn.findPost());
        //             conn.redraw();
        //         }
        //     }
        // }
    }

    /**
     * Create a minimap.
     */
    createMinimap() {
        // this.minimapDiv = document.createElement("div");
        // this.minimapDiv.className = "minimap";
        // this.parent.appendChild(this.minimapDiv);

        // this.minimap = h("svg");
        // this.minimap.classList.add("minimap");
        // this.minimap.id = "minimap";
        // this.minimapDiv.appendChild(this.minimap);

        // Box to show current view
        // this.view = h("rect");
        // this.view.classList.add("view");
        // this.minimap.appendChild(this.view);

        // this.gNetworksMini = h("g");
        // this.gConnsMini = h("g");
        // this.gItemsMini = h("g");
        // Order these are appended is important for layering
        // this.minimap.appendChild(this.gNetworksMini);
        // this.minimap.appendChild(this.gConnsMini);
        // this.minimap.appendChild(this.gItemsMini);

        // this.mmWidth = $(this.minimap).width();
        // this.mmHeight = $(this.minimap).height();

        // Default display minimap
        // this.mmDisplay = true;
        this.toggleMiniMap();
    }

    toggleMiniMap() {
        // if (this.mmDisplay === true) {
        //     $(".minimap")[0].style.visibility = "hidden";
        //     this.gConnsMini.style.opacity = 0;
        //     this.mmDisplay = false;
        // } else {
        //     $(".minimap")[0].style.visibility = "visible";
        //     this.gConnsMini.style.opacity = 1;
        //     this.mmDisplay = true ;
        //     this.scaleMiniMap();
        // }
    }

    /**
     * Calculate the minimap position offsets and scaling.
     */
    scaleMiniMap() {
        // if (!this.mmDisplay) {
        //     return;
        // }

        // const keys = Object.keys(this.svgObjects);
        // if (keys.length === 0) {
        //     return;
        // }

        // // TODO: Could also store the items at the four min max values
        // // and only compare against those, or check against all items
        // // in the lists when they move. Might be important for larger
        // // networks.
        // let firstItem = true;
        // Object.keys(this.svgObjects).forEach(key => {
        //     const item = this.svgObjects[key];
        //     // Ignore anything inside a subnetwork
        //     if (item.depth > 1) {
        //         return;
        //     }

        //     const minmaxXy = item.getMinMaxXY();
        //     if (firstItem === true) {
        //         this.mmMinX = minmaxXy[0];
        //         this.mmMaxX = minmaxXy[1];
        //         this.mmMinY = minmaxXy[2];
        //         this.mmMaxY = minmaxXy[3];
        //         firstItem = false;
        //         return;
        //     }

        //     if (this.mmMinX > minmaxXy[0]) {
        //         this.mmMinX = minmaxXy[0];
        //     }
        //     if (this.mmMaxX < minmaxXy[1]) {
        //         this.mmMaxX = minmaxXy[1];
        //     }
        //     if (this.mmMinY > minmaxXy[2]) {
        //         this.mmMinY = minmaxXy[2];
        //     }
        //     if (this.mmMaxY < minmaxXy[3]) {
        //         this.mmMaxY = minmaxXy[3];
        //     }
        // });

        // this.mmScale = 1 / Math.max(this.mmMaxX - this.mmMinX,
        //                              this.mmMaxY - this.mmMinY);

        // // Give a bit of a border
        // this.mmMinX -= this.mmScale * .05;
        // this.mmMaxX += this.mmScale * .05;
        // this.mmMinY -= this.mmScale * .05;
        // this.mmMaxY += this.mmScale * .05;
        // // TODO: there is a better way to do this than recalculate
        // this.mmScale = 1 / Math.max(this.mmMaxX - this.mmMinX,
        //                              this.mmMaxY - this.mmMinY);

        // this.redraw();
        // this.scaleMiniMapViewBox();
    }

    /**
     * Scale the viewbox in the minimap.
     *
     * Calculate which part of the map is being displayed on the
     * main viewport and scale the viewbox to reflect that.
     */
    scaleMiniMapViewBox() {
        // if (!this.mmDisplay) {
        //     return;
        // }

        // const mmW = this.mmWidth;
        // const mmH = this.mmHeight;

        // const w = mmW * this.mmScale;
        // const h = mmH * this.mmScale;

        // const dispW = (this.mmMaxX - this.mmMinX) * w;
        // const dispH = (this.mmMaxY - this.mmMinY) * h;

        // const viewOffsetX = -(this.mmMinX + this.offsetX) *
        //     w + (mmW - dispW) / 2.;
        // const viewOffsetY = -(this.mmMinY + this.offsetY) *
        //     h + (mmH - dispH) / 2.;

        // this.view.setAttributeNS(null, "x", viewOffsetX);
        // this.view.setAttributeNS(null, "y", viewOffsetY);
        // this.view.setAttribute("width", w / this.scale);
        // this.view.setAttribute("height", h / this.scale);
    }
}
