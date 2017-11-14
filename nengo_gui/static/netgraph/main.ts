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

import { ActionStack } from "./actions";
import { ComponentManager } from "./components";
import { ConnectionManager } from "./connections";

import { Component, Widget } from "../components/base";
import { Network } from "../components/network";
import { config } from "../config";
import { HotkeyManager } from "../hotkeys";
import { Menu } from "../menu";
import { Connection } from "../server";
import * as utils from "../utils";
import { Ensemble } from "../components/ensemble";
import { HTMLView } from "../components/htmlview";
import { Image } from "../components/image";
import { Node } from "../components/node";
import { SpaPointer, SpaSimilarity } from "../components/spa";
import { Raster } from "../components/raster";
import { createComponent, ComponentRegistry } from "../components/registry";
import { Slider } from "../components/slider";
import { Value } from "../components/value";
import { NetGraphView } from "./view";

export class NetGraph {
    actions: ActionStack = new ActionStack();
    components: ComponentManager = new ComponentManager();
    connections: ConnectionManager = new ConnectionManager();
    interactRoot;
    menu: Menu;
    view: NetGraphView;

    private server: Connection;

    private _offset: [number, number] = [0, 0];

    constructor(server: Connection) {
        this.view = new NetGraphView();
        this.view.fontSize = this.fontSize;
        this.view.scale = this.scale;
        this.view.zoomFonts = this.zoomFonts;

        this.interactRoot = interact(this.view.root);
        this.interactRoot.styleCursor(false);
        this.interactRoot.draggable(true);

        this.interactRoot.on("dragstart", () => {
            Menu.hideShown();
            // TODO: Is this really what we want?? Doesn't interact do this already?
            document.documentElement.style.cursor = "move";
        });
        this.interactRoot.on("dragmove", event => {
            this.view.pan(event.dx, event.dy);
        });
        this.interactRoot.on("dragend", event => {
            document.documentElement.style.cursor = "default";
            this.components.syncWithView();
        });
        this.interactRoot.on("wheel", event => {
            event.preventDefault();
            Menu.hideShown();

            enum DeltaMode {
                DOM_DELTA_PIXEL = 0,
                DOM_DELTA_LINE = 1,
                DOM_DELTA_PAGE = 2,
            }

            // How much we scrolled, according to the browser
            let delta;
            if (event.deltaMode === DeltaMode.DOM_DELTA_LINE) {
                if (event.deltaY !== 0) {
                    delta = Math.log(1 + Math.abs(event.deltaY)) * 60;
                    if (event.deltaY < 0) {
                        delta *= -1;
                    }
                } else {
                    delta = 0;
                }
            } else if (event.deltaMode === DeltaMode.DOM_DELTA_PIXEL) {
                delta = event.deltaY;
            } else {
                // DOM_DELTA_PAGE unhandled
                delta = 0;
            }

            // The zoom constant controls how quickly the mouse wheel zooms
            const zoomConstant = 1 / 600;
            let zScale = 1 + Math.abs(delta) * zoomConstant;
            if (delta > 0) {
                // Doing it this way ensures zooming in then out returns
                // to the original zoom level
                zScale = 1 / zScale;
            }
            this.scale = zScale * this.scale;

            // We want to scale centered on the mouse cursor, which is at
            // event.offsetX, event.offsetY relative to the netgraph.
            // The scaling above will scale each pixel by zScale, so we want
            // to move the offset to compensate such that the pixel at
            // event.offsetX, event.offsetY remains at that spot.
            const o = this.offset;
            const x = event.offsetX + o[0];
            const y = event.offsetY + o[1];
            this.offset = [o[0] + x * zScale - x, o[1] + y * zScale - y];

            // this.components.saveLayouts();

            // this.scaleMiniMapViewBox();
            // this.redraw();

            // Let the server know what happened

            // this.server.send("netgraph.zoom", {
            //     scale: this.scale,
            //     x: this.offset[0],
            //     y: this.offset[1]
            // });
        });
        //this.interactRoot.on("click", (event) => {
        //     document.querySelector(".aceText-input")
        //         .dispatchEvent(new Event("blur"));
        // })
        // Scrollwheel on background zooms the full area by changing scale.
        // Note that offsetX,Y are also changed to zoom into a particular
        // point in the space

        // Determine when to pull up the menu
        this.interactRoot.on("hold", event => {
            // Change to "tap" for right click
            if (event.button === 0) {
                if (Menu.shown !== null) {
                    Menu.hideShown();
                } else {
                    this.menu.show(event.clientX, event.clientY);
                }
                event.stopPropagation();
            }
        });
        this.interactRoot.on("tap", event => {
            // Get rid of menus when clicking off
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

        server.bind("netgraph.pan", ({ x, y }) => {
            this.offset = [x, y];
        });
        server.bind("netgraph.zoom", ({ zoom }: { zoom: number }) => {
            this.scale = zoom;
        });

        // TODO: How much error checking are we supposed to do?
        // Should I check that the uid gives a network or do I just
        // let it throw an error?
        // Or should I make a seperate list of interactables
        // server.bind("netgraph.expand", ({ uid }: { uid: string }) => {
        //     const item = this.svgObjects.net[uid];
        //     item.expand(true, true);
        // });
        // server.bind("netgraph.collapse", ({ uid }: { uid: string }) => {
        //     const item = this.svgObjects.net[uid];
        //     item.expand(true, true);
        // });

        // Should probably make a shape param too
        // server.bind(
        //     "netgraph.posSize",
        //     () => {}
            // {uid, x, y, width, height}: {uid: string} & utils.Shape) => {
            //     const item = this.svgObjects[uid];
            //     item.x = x;
            //     item.y = y;
            //     item.width = width;
            //     item.height = height;

            //     item.redraw();

            //     // this.scaleMiniMap();
            // }
        // );

        server.bind(
            "netgraph.config",
            ({ uid, config }: { uid: string } & { config: any }) => {
                // Anything about the config of a component has changed
                const component = this.components[uid];
                component.updateLayout(config);
            }
        );

        // server.bind("netgraph.remove", ({ uid }) => {
        //     // TODO: this feels hacky
        //     // (which is why TypeScript is complaining)
        //     let item = this.svgObjects[uid];
        //     if (item === undefined) {
        //         item = this.svgConns[uid];
        //     }
        //     item.remove();
        // });

        // server.bind(
        //     "netgraph.reconnect",
        //     ({ uid, pres, posts }: { uid: string } & any & any) => {
        //         const netConn = this.svgConns[uid];
        //         netConn.setPres(pres);
        //         netConn.setPosts(posts);
        //         netConn.setRecurrent(pres[0] === posts[0]);
        //         netConn.redraw();
        //     }
        // );

        server.bind(
            "netgraph.reconnect",
            ({ uid, notifyServer }: { uid: string } & any) => {
                const component = this.components[uid];
                // component.remove(true, notifyServer);
            }
        );

        for (const compName in ComponentRegistry) {
            server.bind(`netgraph.create_${compName}`, (argobj) => {
                argobj.server = this.server;
                this.add(createComponent(compName, argobj));
            });
        }

        // Attach to connection
        server.bind("netgraph.create_connection", ({ pre, post }) => {
            this.connect(pre, post);
        });

        this.server = server;

        // Respond to resize events
        window.addEventListener("resize", event => this.onresize(event));

        // this.createMinimap();
        this.menu = new Menu();
        this.addMenuItems();
    }

    get aspectResize(): boolean {
        return config.aspectResize;
    }

    set aspectResize(val) {
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

    get height(): number {
        return this.view.height;
    }

    get offset(): [number, number] {
        return this.view.offset;
    }

    set offset(val: [number, number]) {
        this.view.offset = val;
        // TODO: more, update things that need updating
        // this.redraw(); // ???
    }

    get scale(): number {
        return this.components.scale;
    }

    set scale(val: number) {
        this.components.scale = val;
        this.view.scale = val;
    }

    /**
     * Return the pixel height of the SVG times the current scale factor.
     */
    get scaledHeight() {
        console.assert(this.view.height !== 0);
        console.assert(this.scale !== 0);
        return this.view.height * this.scale;
    }

    get scaledOffset() {
        return this.view.offset.map(v => v * this.scale);
    }

    /**
     * Return the pixel width of the SVG times the current scale factor.
     */
    get scaledWidth() {
        console.assert(this.view.width !== 0);
        console.assert(this.scale !== 0);
        return this.view.width * this.scale;
    }

    get width(): number {
        return this.view.width;
    }

    get zoomFonts(): boolean {
        return config.zoomFonts;
    }

    set zoomFonts(val: boolean) {
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
        this.interactRoot.on("dragend resizeend", event => {
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
            this.server.send("netgraph.feedforwardLayout");
        });
    }

    collapse(network: Network, reportToServer = false, auto = false) {
        // this.gClass.pop();
        // Remove child NetGraphItems and NetGraphConnections
        // while (this.childConnections.length > 0) {
        //     this.childConnections[0].remove();
        // }
        // while (this.children.length > 0) {
        //     this.children[0].remove();
        // }
        // if (this.expanded) {
        //     this.expanded = false;
        // if (this.ng.transparentNets) {
        //     this.view.transparentShape(false);
        // }
        // this.gNetworks.removeChild(this.view.g);
        // this.ng.view.gItems.appendChild(this.view.g);
        // if (!this.minimap) {
        //     this.miniItem.collapse(reportToServer, auto);
        // }
        // } else {
        //     console.warn(
        //         "collapsed a network that was already collapsed: " + this);
        // }
        // if (reportToServer) {
        // if (auto) {
        //     // Update the server, but do not place on the undo stack
        //     this.ng.notify("autoCollapse", {uid: this.uid});
        // } else {
        //     this.ng.notify("collapse", {uid: this.uid});
        // }
        // }
    }

    connect(pre: Component, post: Component) {
        // const connection = this.components.connect(pre, post);
        // this.view.conns.appendChild(connection.view.root);
        // TODO: update positions without having to move
    }

    // this will need to be refactored later
    createNode(ngiArg, interArg, dimensions, html) {
        // TODO: fill in the rest of the args
        // const item = new NodeItem(ngiArg, interArg, dimensions, html);
        // this.svgObjects.node[ngiArg.uid] = item;
        // this.detectCollapsedConns(item.uid);
    }

    /**
     * Create a new NetGraphConnection.
     */
    createConnection(info) {
        // const connMini = new NetGraphConnection(this, info, true, null);
        // this.svgConns[info.uid] = new NetGraphConnection(
        //     this, info, false, connMini);
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
    // detectCollapsedConns(uid) {
    //     const conns = this.collapsedConns[uid];
    //     if (conns !== undefined) {
    //         delete this.collapsedConns[uid];
    //         for (let i = 0; i < conns.length; i++) {
    //             const conn = conns[i];
    //             // Make sure the NetGraphConnection hasn't been removed since
    //             // it started listening.
    //             if (!conn.removed) {
    //                 conn.setPre(conn.findPre());
    //                 conn.setPost(conn.findPost());
    //                 conn.redraw();
    //             }
    //         }
    //     }
    // }

    expand(network: Network, returnToServer = true, auto = false) {
        // Default to true if no parameter is specified
        if (typeof returnToServer !== "undefined") {
            returnToServer = true;
        }
        auto = typeof auto !== "undefined" ? auto : false;

        // this.gClass.push("expanded");

        // if (!this.expanded) {
        //     this.expanded = true;
        //     // if (this.ng.transparentNets) {
        //     //     this.view.transparentShape(false);
        //     // }
        //     // this.ng.view.gItems.removeChild(this.view.g);
        //     // this.gNetworks.appendChild(this.view.g);
        //     if (!this.minimap) {
        //         this.miniItem.expand(returnToServer, auto);
        //     }
        // } else {
        //     console.warn(
        //         "expanded a network that was already expanded: " + this);
        // }

        // if (returnToServer) {
        //     // if (auto) {
        //     //     // Update the server, but do not place on the undo stack
        //     //     this.ng.notify("autoExpand", {uid: this.uid});
        //     // } else {
        //     //     this.ng.notify("expand", {uid: this.uid});
        //     // }
        // }
    }

    hotkeys(manager: HotkeyManager) {
        manager.add("Undo", "z", { ctrl: true }, () => {
            // this.notify("undo", "1");
        });
        manager.add("Redo", "z", { ctrl: true, shift: true }, () => {
            // this.notify("undo", "0");
        });
        manager.add("Redo", "y", { ctrl: true }, () => {
            // this.notify("undo", "0");
        });
        manager.add("Toggle minimap", "m", { ctrl: true }, () => {
            // this.minimap.toggle();
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
    onresize = utils.throttle(event => {
        // const width = this.view.width;
        // const height = this.view.height;
        // console.assert(width !== 0);
        // console.assert(height !== 0);

        // if (this.aspectResize) {
        //     Object.keys(this.svgObjects).forEach(objType => {
        //         Object.keys(this.svgObjects[objType]).forEach(key => {
        //             const item = this.svgObjects[objType][key];
        //             // TODO: this is the only thing ViewPort is being used for,
        //             // so it can probably be removed
        //             if (item.depth === 1) {
        //                 // const newWidth =
        //                 //     this.viewPort.scaleWidth(item.width) / this.scale;
        //                 // const newHeight =
        //                 //     this.viewPort.scaleHeight(item.height) / this.scale;
        //                 // item.width = newWidth / (2 * width);
        //                 // item.height = newHeight / (2 * height);
        //             }
        //         });
        //     });
        // }

        // this.redraw();
        this.components.onresize(event);
    }, 66);

    /**
     * Redraw all elements
     */
    // redraw() {
    //     Object.keys(this.svgObjects).forEach(objType => {
    //         Object.keys(this.svgObjects[objType]).forEach(key => {
    //             this.svgObjects[objType][key].redraw();
    //         });
    //     });
    //     Object.keys(this.svgConns).forEach(key => {
    //         this.svgConns[key].redraw();
    //     });
    // }

    /**
     * Register a NetGraphConnection with a target item that it is looking for.
     *
     * This is a NetGraphItem that does not exist yet, because it is inside a
     * collapsed network. When it does appear, NetGraph.detectCollapsed will
     * handle notifying the NetGraphConnection.
     */
    // registerConn(conn, target) {
    //     if (this.collapsedConns[target] === undefined) {
    //         this.collapsedConns[target] = [conn];
    //     } else {
    //         const index = this.collapsedConns[target].indexOf(conn);
    //         if (index === -1) {
    //             this.collapsedConns[target].push(conn);
    //         }
    //     }
    // }

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
