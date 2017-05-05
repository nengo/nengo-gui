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

        this.pre.interactable.on("dragmove", () => {
            this.view.startPos = this.pre.view.centerPos;
        });
        this.post.interactable.on("dragmove", () => {
            this.view.endPos = this.post.view.centerPos;
        });

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

    createLine() {
        // if (this.recurrent) {
            // this.recurrentEllipse = this.ng.createSVGElement("path");
            // this.recurrentEllipse.setAttribute(
            //     "d",
            //     "M6.451,28.748C2.448,26.041,0,22.413,0,18.425C0, " +
            //         "10.051,10.801,3.262,24.125,3.262 " +
            //         "S48.25,10.051,48.25,18.425c0," +
            //         "6.453-6.412,11.964-15.45,14.153");
            // this.recurrentEllipse.setAttribute("class", "recur");
            // this.g.appendChild(this.recurrentEllipse);

            // this.marker = this.ng.createSVGElement("path");
            // this.g.appendChild(this.marker);

            // if (this.minimap === false) {
            //     this.marker.setAttribute("d", "M 6.5 0 L 0 5.0 L 7.5 8.0 z");
            // } else {
            //     this.marker.setAttribute("d", "M 4 0 L 0 2 L 4 4 z");
            // }
        // } else {
            // this.line = this.ng.createSVGElement("line");
            // this.g.appendChild(this.line);
            // this.marker = this.ng.createSVGElement("path");
            // if (this.minimap === false) {
            //     this.marker.setAttribute("d", "M 10 0 L -5 -5 L -5 5 z");
            // } else {
            //     this.marker.setAttribute("d", "M 3 0 L -2.5 -2.5 L -2.5 2.5 z");
            // }
            // this.g.appendChild(this.marker);
        // }
    }

    removeLine() {
        // if (this.recurrent) {
        //     this.g.removeChild(this.recurrentEllipse);
        //     this.g.removeChild(this.marker);
        //     this.recurrentEllipse = undefined;
        //     this.marker = undefined;
        // } else {
        //     this.g.removeChild(this.line);
        //     this.g.removeChild(this.marker);
        //     this.line = undefined;
        //     this.marker = undefined;
        // }
    }

    /**
     * Redraw the connection.
     */
    redraw() {
        if (this.pre === null || this.post === null) {
            if (this.line !== undefined) {
                this.line.setAttribute("visibility", "hidden");
            }
            this.marker.setAttribute("visibility", "hidden");
            return;
        } else {
            if (this.line !== undefined) {
                this.line.setAttribute("visibility", "visible");
            }
            this.marker.setAttribute("visibility", "visible");
        }
        const prePos = this.pre.getScreenLocation();

        if (this.recurrent) {
        } else {
            const postPos = this.post.getScreenLocation();
            this.line.setAttribute("x1", prePos[0]);
            this.line.setAttribute("y1", prePos[1]);
            this.line.setAttribute("x2", postPos[0]);
            this.line.setAttribute("y2", postPos[1]);

            // Angle between objects
            let angle = Math.atan2(
                postPos[1] - prePos[1], postPos[0] - prePos[0]);

            const w1 = this.pre.getScreenWidth();
            const h1 = this.pre.getScreenHeight();
            const w2 = this.post.getScreenWidth();
            const h2 = this.post.getScreenHeight();

            const a1 = Math.atan2(h1, w1);
            const a2 = Math.atan2(h2, w2);

            const preLength = this.intersectLength(angle, a1, w1, h1);
            let postToPreAngle = angle - Math.PI;
            if (postToPreAngle < -Math.PI) {
                postToPreAngle += 2 * Math.PI;
            }
            const postLength =
                this.intersectLength(postToPreAngle, a2, w2, h2);

            let mx = (prePos[0] + preLength[0]) * 0.4 +
                (postPos[0] + postLength[0]) * 0.6;
            let my = (prePos[1] + preLength[1]) * 0.4 +
                (postPos[1] + postLength[1]) * 0.6;

            // Check to make sure the marker doesn't go past either endpoint
            const vec1 = [postPos[0] - prePos[0], postPos[1] - prePos[1]];
            const vec2 = [mx - prePos[0], my - prePos[1]];
            const dotProd = (vec1[0] * vec2[0] + vec1[1] * vec2[1]) /
                (vec1[0] * vec1[0] + vec1[1] * vec1[1]);

            if (dotProd < 0) {
                mx = prePos[0];
                my = prePos[1];
            } else if (dotProd > 1) {
                mx = postPos[0];
                my = postPos[1];
            }
            angle = 180 / Math.PI * angle;
            this.marker.setAttribute(
                "transform", "translate(" + mx + "," + my + ")" +
                    " rotate(" + angle + ")");
        }

        if (!this.minimap && this.ng.mmDisplay) {
            this.miniConn.redraw();
        }
    }

    /**
     * Determine the length of an intersection line through a rectangle.
     *
     * @param {number} theta - the angle of the line
     * @param {number} alpha - the angle between zero and the top right corner
     *                         of the object
     */
    intersectLength(
        theta, alpha, width, height) {
        const beta = 2 * (Math.PI / 2 - alpha); // Angle between top corners
        let x;
        let y;

        if (theta >= -alpha && theta < alpha) {
            // 1st quadrant
            x = width / 2;
            y = width / 2 * Math.tan(theta);
        } else if (theta >= alpha && theta < alpha + beta) {
            // 2nd quadrant
            x = (height / 2) / Math.tan(theta);
            y = height / 2;
        } else if (theta >= alpha + beta || theta < -(alpha + beta)) {
            // 3rd quadrant
            x = -width / 2;
            y = -width / 2 * Math.tan(theta);
        } else {
            // 4th quadrant
            x = -(height / 2) / Math.tan(theta);
            y = -height / 2;
        }

        return [x, y];
    }
}

export class RecurrentConnection extends ComponentConnection {
    readonly component: Component;
    view: RecurrentConnectionView;

    constructor(component) {
        super();
        this.component = component;
        this.view = new RecurrentConnectionView();

        this.component.interactable.on("dragmove", () => {
            this.view.pos = this.component.view.centerPos;
        });
    }
}
