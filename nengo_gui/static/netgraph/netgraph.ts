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
import * as $ from "jquery";
import { dom, h, VNode } from "maquette";

import * as allComponents from "../components/all-components";
import { config } from "../config";
import * as menu from "../menu";
import * as viewport from "../viewport";
import { Connection } from "../websocket";
import { NetGraphConnection } from "./connection";
import { Minimap } from "./minimap";
import { NetGraphItem } from "./item";
import "./netgraph.css";

interface ItemDict {
    [uid: string]: NetGraphItem;
}

interface ConnDict {
    [uid: string]: NetGraphConnection;
}

export class NetGraph {

    /**
     * Since connections may go to items that do not exist yet (since they
     * are inside a collapsed network), this dictionary keeps a list of
     * connections to be notified when a particular item appears.  The
     * key in the dictionary is the uid of the nonexistent item, and the
     * value is a list of NetGraphConnections that should be notified
     * when that item appears.
     */
    collapsedConns: ConnDict = {};
    div;
    gConns;
    gConnsMini;
    gItems;
    gItemsMini;
    gNetworks;
    gNetworksMini;
    height;
    inZoomDelay;
    menu;
    minimap;
    offsetX = 0; // Global x,y pan offset
    offsetY = 0; // Global x,y pan offset
    svg;
    svgConns: ConnDict = {};
    svgObjects: ItemDict = {};
    toolHeight;
    uid: string;
    view;
    width;
    ws;

    parent;
    minimapObjects;
    private _scale: number = 1.0;

    constructor(uid: string) {
        this.uid = uid;

        if (uid[0] === "<") {
            console.warn("invalid uid for NetGraph: " + uid);
        }

        this.inZoomDelay = false;

        // this.minimap = new Minimap();

        this.toolHeight = $("#toolbarObject").height();

        // Reading netgraph.css file as text and embedding it within def tags;
        // this is needed for saving the SVG plot to disk.
        const css = require("!!css-loader!./netgraph.css").toString();

        const defs = h("defs", [h(
            "style", {type: "text/css"}, ["<![CDATA[\n" + css + "\n]]>"]
        )]);

        // Three separate layers, so that expanded networks are at the back,
        // then connection lines, and then other items (nodes, ensembles, and
        // collapsed networks) are drawn on top.
        this.gNetworks = h("g");
        this.gConns = h("g");
        this.gItems = h("g");

        // Create the master SVG element
        this.svg = h("svg.netgraph#netgraph", {
            styles: {width: "100%", height: "100%", position: "absolute"},
            onresize: event => {
                this.onResize(event);
            },
        }, [
            defs,
            this.gNetworks,
            this.gConns,
            this.gItems,
        ]);

        // interact(this.svg).styleCursor(false);

        this.width = $(this.svg).width();
        this.height = $(this.svg).height();

        // Connect to server
        this.ws = new Connection(uid); // TODO: , "netgraph");
        this.ws.onmessage = event => {
            this.onMessage(event);
        };

        // Respond to resize events
        window.addEventListener("resize", event => {
            this.onResize(event);
        });

        // Dragging the background pans the full area by changing offsetX,Y
        // Define cursor behaviour for background
        interact(this.svg)
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
            });

        interact(this.svg)
            .draggable({
                onend: event => {
                    // Let the server know what happened
                    this.notify({act: "pan", x: this.offsetX, y: this.offsetY});
                },
                onmove: event => {
                    this.offsetX += event.dx / this.getScaledWidth();
                    this.offsetY += event.dy / this.getScaledHeight();
                    Object.keys(this.svgObjects).forEach(key => {
                        this.svgObjects[key].redrawPosition();
                        // if (this.mmDisplay) {
                        //     this.minimapObjects[key].redrawPosition();
                        // }
                    });
                    Object.keys(this.svgConns).forEach(key => {
                        this.svgConns[key].redraw();
                    });

                    viewport.setPosition(this.offsetX, this.offsetY);

                    this.scaleMiniMapViewBox();

                },
                onstart: () => {
                    menu.hideAny();
                },
            });

        // Scrollwheel on background zooms the full area by changing scale.
        // Note that offsetX,Y are also changed to zoom into a particular
        // point in the space
        interact(document.getElementById("main"))
            .on("click", event => {
                $(".aceText-input").blur();
            })
            .on("wheel", event => {
                event.preventDefault();

                menu.hideAny();
                const x = (event.clientX) / this.width;
                const y = (event.clientY - this.toolHeight) / this.height;
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

                allComponents.saveLayouts();

                const xx = x / this.scale - this.offsetX;
                const yy = y / this.scale - this.offsetY;
                this.offsetX = (this.offsetX + xx) / zScale - xx;
                this.offsetY = (this.offsetY + yy) / zScale - yy;

                this.scale = zScale * this.scale;
                viewport.setPosition(this.offsetX, this.offsetY);

                this.scaleMiniMapViewBox();

                this.redraw();

                // Let the server know what happened
                this.notify({
                    act: "zoom",
                    scale: this.scale,
                    x: this.offsetX,
                    y: this.offsetY,
                });
            });

        this.menu = new menu.Menu(this.parent);

        // Determine when to pull up the menu
        interact(this.svg)
            .on("hold", event => { // Change to "tap" for right click
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        menu.hideAny();
                    } else {
                        this.menu.show(event.clientX, event.clientY,
                                       this.generateMenu());
                    }
                    event.stopPropagation();
                }
            })
            .on("tap", event => { // Get rid of menus when clicking off
                if (event.button === 0) {
                    if (this.menu.visibleAny()) {
                        menu.hideAny();
                    }
                }
            });

        $(this.svg).bind("contextmenu", event => {
            event.preventDefault();
            if (this.menu.visibleAny()) {
                menu.hideAny();
            } else {
                this.menu.show(
                    event.clientX, event.clientY, this.generateMenu());
            }
        });

        this.createMinimap();
        this.updateFonts();
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
        this.updateFonts();
    }

    get scale(): number {
        return this._scale;
    }

    set scale(val: number) {
        if (val === this._scale) {
            return;
        }
        this._scale = val;
        this.updateFonts();
        this.redraw();

        viewport.setScale(this._scale);
    }

    get transparentNets(): boolean {
        return config.transparentNets;
    }

    set transparentNets(val: boolean) {
        if (val === config.transparentNets) {
            return;
        }
        config.transparentNets = val;
        Object.keys(this.svgObjects).forEach(key => {
            const ngi = this.svgObjects[key];
            ngi.computeFill();
            if (ngi.type === "net" && ngi.expanded) {
                ngi.shape.style["fill-opacity"] = val ? 0.0 : 1.0;
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
        this.updateFonts();
    }

    generateMenu() {
        return [["Auto-layout", () => {
            this.notify({act: "feedforwardLayout", uid: null});
        }]];
    }

    /**
     * Event handler for received WebSocket messages
     */
    onMessage(event) {
        const data = JSON.parse(event.data);
        let item;

        if (data.type === "net") {
            this.createObject(data);
        } else if (data.type === "ens") {
            this.createObject(data);
        } else if (data.type === "node") {
            this.createObject(data);
        } else if (data.type === "conn") {
            this.createConnection(data);
        } else if (data.type === "pan") {
            this.setOffset(data.pan[0], data.pan[1]);
        } else if (data.type === "zoom") {
            this.scale = data.zoom;
        } else if (data.type === "expand") {
            item = this.svgObjects[data.uid];
            item.expand(true, true);
        } else if (data.type === "collapse") {
            item = this.svgObjects[data.uid];
            item.collapse(true, true);
        } else if (data.type === "posSize") {
            item = this.svgObjects[data.uid];
            item.x = data.pos[0];
            item.y = data.pos[1];
            item.width = data.size[0];
            item.height = data.size[1];

            item.redraw();

            this.scaleMiniMap();

        } else if (data.type === "config") {
            // Anything about the config of a component has changed
            const component = allComponents.byUID(data.uid);
            component.updateLayout(data.config);
        } else if (data.type === "js") {
            eval(data.code); // tslint:disable-line
        } else if (data.type === "rename") {
            item = this.svgObjects[data.uid];
            item.setLabel(data.name);

        } else if (data.type === "remove") {
            item = this.svgObjects[data.uid];
            if (item === undefined) {
                item = this.svgConns[data.uid];
            }

            item.remove();

        } else if (data.type === "reconnect") {
            const conn = this.svgConns[data.uid];
            conn.setPres(data.pres);
            conn.setPosts(data.posts);
            conn.setRecurrent(data.pres[0] === data.posts[0]);
            conn.redraw();

        } else if (data.type === "deleteGraph") {
            const component = allComponents.byUID(data.uid);
            component.remove(true, data.notifyServer);
        } else {
            console.warn("invalid message:" + data);
        }
    }

    /**
     * Report an event back to the server
     */
    notify(info) {
        this.ws.send(JSON.stringify(info));
    }

    /**
     * Pan the screen (and redraw accordingly)
     */
    setOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
        this.redraw();

        viewport.setPosition(x, y);
    }

    updateFonts() {
        if (this.zoomFonts) {
            $("#main").css("font-size",
                           3 * this.scale * this.fontSize / 100 + "em");
        } else {
            $("#main").css("font-size", this.fontSize / 100 + "em");
        }
    }

    /**
     * Redraw all elements
     */
    redraw() {
        Object.keys(this.svgObjects).forEach(key => {
            this.svgObjects[key].redraw();
        });
        Object.keys(this.svgConns).forEach(key => {
            this.svgConns[key].redraw();
        });
    }

    /**
     * Helper function for correctly creating SVG elements.
     */
    createSVGElement(tag) {
        return document.createElementNS("http://www.w3.org/2000/svg", tag);
    }

    /**
     * Create a new NetGraphItem.
     *
     * If an existing NetGraphConnection is looking for this item, it will be
     * notified
     */
    createObject(info) {
        const itemMini = new NetGraphItem(this, info, true, null);
        this.minimapObjects[info.uid] = itemMini;

        const item = new NetGraphItem(this, info, false, itemMini);
        this.svgObjects[info.uid] = item;

        this.detectCollapsedConns(item.uid);
        this.detectCollapsedConns(itemMini.uid);

        this.scaleMiniMap();
    }

    /**
     * Create a new NetGraphConnection.
     */
    createConnection(info) {
        const connMini = new NetGraphConnection(this, info, true, null);
        // this.minimapConns[info.uid] = connMini;

        const conn = new NetGraphConnection(this, info, false, connMini);
        this.svgConns[info.uid] = conn;
    }

    /**
     * Handler for resizing the full SVG.
     */
    onResize(event) {
        const width = $(this.svg).width();
        const height = $(this.svg).height();

        if (this.aspectResize) {
            Object.keys(this.svgObjects).forEach(key => {
                const item = this.svgObjects[key];
                if (item.depth === 1) {
                    const newWidth = viewport.scaleWidth(item.width) / this.scale;
                    const newHeight =
                        viewport.scaleHeight(item.height) / this.scale;
                    item.width = newWidth / (2 * width);
                    item.height = newHeight / (2 * height);
                }
            });
        }

        this.width = width;
        this.height = height;
        // this.mmWidth = $(this.minimap).width();
        // this.mmHeight = $(this.minimap).height();

        this.redraw();
    }

    /**
     * Return the pixel width of the SVG times the current scale factor.
     */
    getScaledWidth() {
        return this.width * this.scale;
    }

    /**
     * Return the pixel height of the SVG times the current scale factor.
     */
    getScaledHeight() {
        return this.height * this.scale;
    }

    /**
     * Expand or collapse a network.
     */
    toggleNetwork(uid) {
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

        this.minimap = this.createSVGElement("svg");
        this.minimap.classList.add("minimap");
        this.minimap.id = "minimap";
        // this.minimapDiv.appendChild(this.minimap);

        // Box to show current view
        this.view = this.createSVGElement("rect");
        this.view.classList.add("view");
        this.minimap.appendChild(this.view);

        this.gNetworksMini = this.createSVGElement("g");
        this.gConnsMini = this.createSVGElement("g");
        this.gItemsMini = this.createSVGElement("g");
        // Order these are appended is important for layering
        this.minimap.appendChild(this.gNetworksMini);
        this.minimap.appendChild(this.gConnsMini);
        this.minimap.appendChild(this.gItemsMini);

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
