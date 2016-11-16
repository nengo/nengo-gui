import { NetGraphItem } from "./item";

// TODO: This is probably still going to need a type parameter so that
// it draws the correct icon using the correct view
export class MinimapItem extends NetGraphItem {
    constructor(ngiArg, uid) {
        super(ngiArg, uid);
        this.gNetworks = this.ng.gNetworksMini;
        this.gItems = this.ng.gItemsMini;
    }

    _getPos() {
        const mmW = this.ng.mmWidth;
        const mmH = this.ng.mmHeight;

        const w = mmW * this.ng.mmScale;
        const h = mmH * this.ng.mmScale;

        const dispW = (this.ng.mmMaxX - this.ng.mmMinX) * w;
        const dispH = (this.ng.mmMaxY - this.ng.mmMinY) * h;

        const offsetX = -this.ng.mmMinX * w + (mmW - dispW) / 2.;
        const offsetY = -this.ng.mmMinY * h + (mmH - dispH) / 2.;

        return {w, h, offsetX, offsetY};
    }

    _getScreenW() {
        return this.getNestedWidth() * this.ng.mmWidth * this.ng.mmScale;
    }

    getScreenWidth() {
        if (!this.ng.mmDisplay) {
            return 1;
        }
        super.getScreenWidth();
    }

    _getScreenH() {
        return this.getNestedHeight() * this.ng.mmHeight * this.ng.mmScale;
    }

    getScreenHeight() {
        if (!this.ng.mmDisplay) {
            return 1;
        }
        super.getScreenHeight();
    }

    getScreenLocation() {
        if (!this.ng.mmDisplay) {
            return [1, 1];
        }
    }
}
