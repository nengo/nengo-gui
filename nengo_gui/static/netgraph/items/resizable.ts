import * as menu from "../../menu";
import InteractableItem as InteractableItem from "./interactable.ts";

export class ResizableItem extends InteractableItem {
    constructor() {
        super();

        interact(this.area).resizable({
                edges: {bottom: true, left: true, right: true, top: true},
                invert: this.type === "ens" ? "reposition" : "none",
                margin: 10,
            }).on("resizestart", event => {
                menu.hideAny();
            }).on("resizemove", event => {
                const item = this.ng.svgObjects[uid];
                const pos = item.getScreenLocation();
                let hScale = this.ng.getScaledWidth();
                let vScale = this.ng.getScaledHeight();
                let parent = item.parent;
                while (parent !== null) {
                    hScale = hScale * parent.width * 2;
                    vScale = vScale * parent.height * 2;
                    parent = parent.parent;
                }

                if (this.aspect !== null) {
                    this.constrainAspect();

                    const verticalResize =
                        event.edges.bottom || event.edges.top;
                    const horizontalResize =
                        event.edges.left || event.edges.right;

                    let w = pos[0] - event.clientX + this.ng.offsetX;
                    let h = pos[1] - event.clientY + this.ng.offsetY;

                    if (event.edges.right) {
                        w *= -1;
                    }
                    if (event.edges.bottom) {
                        h *= -1;
                    }
                    if (w < 0) {
                        w = 1;
                    }
                    if (h < 0) {
                        h = 1;
                    }

                    const screenW = item.width * hScale;
                    const screenH = item.height * vScale;

                    if (horizontalResize && verticalResize) {
                        const p = (screenW * w + screenH * h) / Math.sqrt(
                            screenW * screenW + screenH * screenH);
                        const norm = Math.sqrt(
                            this.aspect * this.aspect + 1);
                        h = p / (this.aspect / norm);
                        w = p * (this.aspect / norm);
                    } else if (horizontalResize) {
                        h = w / this.aspect;
                    } else {
                        w = h * this.aspect;
                    }

                    item.width = w / hScale;
                    item.height = h / vScale;
                } else {
                    const dw = event.deltaRect.width / hScale / 2;
                    const dh = event.deltaRect.height / vScale / 2;
                    const offsetX = dw + event.deltaRect.left / hScale;
                    const offsetY = dh + event.deltaRect.top / vScale;

                    item.width += dw;
                    item.height += dh;
                    item.x += offsetX;
                    item.y += offsetY;
                }

                item.redraw();

                if (this.depth === 1) {
                    this.ng.scaleMiniMap();
                }
            }).on("resizeend", event => {
                const item = this.ng.svgObjects[uid];
                item.constrainPosition();
                item.redraw();
                this.ng.notify({
                    act: "posSize",
                    height: item.height,
                    uid: uid,
                    width: item.width,
                    x: item.x,
                    y: item.y,
                });
            });
    }

    redrawSize() {
        super();
        this.shape.setAttribute(
            "transform",
            "translate(-" + (screenW / 2) + ", -" + (screenH / 2) + ")");
        this.shape.setAttribute("width", screenW);
        this.shape.setAttribute("height", screenH);
    }

    computerFill() {
        super();
        const fill = Math.round(255 * Math.pow(0.8, depth));
        this.shape.style.fill =
            "rgb(" + fill + "," + fill + "," + fill + ")";
        const stroke = Math.round(255 * Math.pow(0.8, depth + 2));
        this.shape.style.stroke =
            "rgb(" + stroke + "," + stroke + "," + stroke + ")";
    }
}

export class NodeItem extends ResizableItem {
    constructor() {
        super();
        this.shape = h("rect");
    }

    generateMenu() {
        items.push(["Slider", () => {
            this.createGraph("Slider");
        }]);
        if (this.dimensions > 0) {
            items.push(["Value", () => {
                this.createGraph("Value");
            }]);
        }
        if (this.dimensions > 1) {
            items.push(["XY-value", () => {
                this.createGraph("XYValue");
            }]);
        }
        if (this.htmlNode) {
            items.push(["HTML", () => {
                this.createGraph("HTMLView");
            }]);
        }

        items.push(["Details ...", () => {
            this.createModal();
        }]);
        return items;
    }

    redrawSize() {
        super();
        this.shape.setAttribute(
            "transform",
            "translate(-" + (screenW / 2) + ", -" + (screenH / 2) + ")");
        this.shape.setAttribute("width", screenW);
        this.shape.setAttribute("height", screenH);

        const radius = Math.min(screenW, screenH);
        // TODO: Don't hardcode .1 as the corner radius scale
        this.shape.setAttribute("rx", radius * .1);
        this.shape.setAttribute("ry", radius * .1);
    }
}

export class NetItem extends ResizableItem {
    constructor(expanded, spTargets) {
        super();
        this.shape = h("rect");
        this.expanded = expanded;
        this.spTargets = spTargets;

        // If a network is flagged to expand on creation, then expand it
        if (expanded) {
            // Report to server but do not add to the undo stack
            this.expand(true, true);
        }
    }

    generateMenu() {
        if (this.expanded) {
            items.push(["Collapse network", () => {
                this.collapse(true);
            }]);
            items.push(["Auto-layout", () => {
                this.requestFeedforwardLayout();
            }]);
        } else {
            items.push(["Expand network", () => {
                this.expand();
            }]);
        }
        if (this.defaultOutput && this.spTargets.length === 0) {
            items.push(["Output Value", () => {
                this.createGraph("Value");
            }]);
        }

        if (this.spTargets.length > 0) {
            items.push(["Semantic pointer cloud", () => {
                this.createGraph("Pointer", this.spTargets[0]);
            }]);
            items.push(["Semantic pointer plot", () => {
                this.createGraph("SpaSimilarity", this.spTargets[0]);
            }]);
        }

        items.push(["Details ...", () => {
            this.createModal();
        }]);
        return items;
    }
}

export class EnsembleItem extends ResizableItem {
    constructor() {
        super();

        // TODO: This means it resizes differently and other stuff!
        this.aspect = 1.;
        this.shape = this.ensembleSvg();
    }

    /**
     * Function for drawing ensemble svg.
     */
    ensembleSvg() {
        const shape = h("g");
        shape.setAttribute("class", "ensemble");

        const dx = -1.25;
        const dy = 0.25;

        let circle = h("circle");
        this.setAttributes(
            circle, {cx: -11.157 + dx, cy: -7.481 + dy, r: "4.843"});
        shape.appendChild(circle);
        circle = h("circle");
        this.setAttributes(
            circle, {cx: 0.186 + dx, cy: -0.127 + dy, r: "4.843"});
        shape.appendChild(circle);
        circle = h("circle");
        this.setAttributes(
            circle, {cx: 5.012 + dx, cy: 12.56 + dy, r: "4.843"});
        shape.appendChild(circle);
        circle = h("circle");
        this.setAttributes(
            circle, {cx: 13.704 + dx, cy: -0.771 + dy, r: "4.843"});
        shape.appendChild(circle);
        circle = h("circle");
        this.setAttributes(
            circle, {cx: -10.353 + dx, cy: 8.413 + dy, r: "4.843"});
        shape.appendChild(circle);
        circle = h("circle");
        this.setAttributes(
            circle, {cx: 3.894 + dx, cy: -13.158 + dy, r: "4.843"});
        shape.appendChild(circle);

        return shape;
    }

    generateMenu() {
        items.push(["Value", () => {
            this.createGraph("Value");
        }]);
        if (this.dimensions > 1) {
            items.push(["XY-value", () => {
                this.createGraph("XYValue");
            }]);
        }
        items.push(["Spikes", () => {
            this.createGraph("Raster");
        }]);
        items.push(["Voltages", () => {
            this.createGraph("Voltage");
        }]);
        items.push(["Firing pattern", () => {
            this.createGraph("SpikeGrid");
        }]);

        items.push(["Details ...", () => {
            this.createModal();
        }]);
        return items;
    }

    redrawSize() {
        super();
        const scale = Math.sqrt(screenH * screenH + screenW * screenW) /
            Math.sqrt(2);
        const r = 17.8; // TODO: Don't hardcode the size of the ensemble
        this.shape.setAttribute(
            "transform", "scale(" + scale / 2 / r + ")");
        this.shape.style.setProperty("stroke-width", 20 / scale);
        areaW = screenW * 0.97;
        this.area.setAttribute("width", areaW);
    }
}
