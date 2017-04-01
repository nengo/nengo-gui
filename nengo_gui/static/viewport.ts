import { NetGraph } from "./netgraph/netgraph";

export class ViewPort {
    netgraph: NetGraph;
    mainDiv: HTMLElement;
    _scale: number;
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(ng) {
        this._scale = 1.0;
        this.x = 0;
        this.y = 0;

        this.netgraph = ng;
        this.mainDiv = this.netgraph.view.root;

        const clientRect = this.mainDiv.getBoundingClientRect();
        this.width = clientRect.width;
        this.height = clientRect.height;

        window.addEventListener("resize", (event) => {
            this.onResize();
        });
    }

    // TODO: take position argument type
    set position({newX, newY}) {
        this.x = newX;
        this.y = newY;
        this.redraw();
    }

    set scale(newScale) {
        this._scale = newScale;
        this.redraw();
    }

    get scale() {
        return this._scale;
    }

    redraw() {
        this.netgraph.allComponents.onResize(
            this.scale * this.width * 2,
            this.height * this.scale * 2,
        );
        this.netgraph.allComponents.redraw();
    }

    onResize() {
        const oldWidth = this.width;
        const oldHeight = this.height;

        const clientRect = this.mainDiv.getBoundingClientRect();
        this.width = clientRect.width;
        this.height = clientRect.height;

        if (this.netgraph.aspectResize) {
            this.netgraph.allComponents.rescale(
                oldWidth / this.width,
                oldHeight / this.height,
            );
        }

        this.redraw();
    }

    fromScreenX(screenX): number {
        return screenX / (this.width * this.scale);
    }

    shiftX(componentX): number {
        return componentX + this.x;
    }

    toScreenX(componentX): number {
        return this.shiftX(componentX) *  this.width * this.scale;
    }

    fromScreenY(screenY): number {
        return screenY / (this.height * this.scale);
    }

    shiftY(componentY): number {
        return componentY + this.y;
    }

    toScreenY(componentY): number {
        return this.shiftY(componentY) *  this.height * this.scale;
    }

    scaleWidth(componentWidth): number {
        return componentWidth * this.width * this.scale * 2;
    }

    scaleHeight(componentHeight): number {
        return componentHeight * this.height * this.scale * 2;
    }

    unscaleWidth(screenWidth): number {
        return screenWidth / (this.width * this.scale) / 2;
    }

    unscaleHeight(screenHeight): number {
        return screenHeight / (this.height * this.scale) / 2;
    }
}
