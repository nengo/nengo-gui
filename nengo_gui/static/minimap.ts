// import { NetGraphConnection } from "./connection";
// import { NetGraphItem } from "./item";

export class Minimap {
    // conns: {[uid: string]: NetGraphConnection} = {};
    div;
    display;
    height;
    maxX: number = 0;
    minX: number = 0;
    maxY: number = 0;
    minY: number = 0;
    // objects: {[uid: string]: NetGraphItem} = {};
    // scale: number = 0.1;
    width;

    constructor() {
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
        this.toggle();
    }

    scale() {
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

    scaleViewBox() {
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

    toggle() {
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
}

// TODO: This is probably still going to need a type parameter so that
// it draws the correct icon using the correct view
// export class MinimapItem extends NetGraphItem {
//     constructor(ngiArg) {
//         super(ngiArg);
//         this.gNetworks = this.ng.gNetworksMini;
//         this.gItems = this.ng.gItemsMini;
//     }

//     _renderShape() {
//         console.log("render");
//     }

//     _getPos() {
//         const mmW = this.ng.mmWidth;
//         const mmH = this.ng.mmHeight;

//         const w = mmW * this.ng.mmScale;
//         const h = mmH * this.ng.mmScale;

//         const dispW = (this.ng.mmMaxX - this.ng.mmMinX) * w;
//         const dispH = (this.ng.mmMaxY - this.ng.mmMinY) * h;

//         const offsetX = -this.ng.mmMinX * w + (mmW - dispW) / 2.;
//         const offsetY = -this.ng.mmMinY * h + (mmH - dispH) / 2.;

//         return {w, h, offsetX, offsetY};
//     }

//     _getScreenW() {
//         return this.getNestedWidth() * this.ng.mmWidth * this.ng.mmScale;
//     }

//     getScreenWidth() {
//         if (!this.ng.mmDisplay) {
//             return 1;
//         }
//         super.getScreenWidth();
//     }

//     _getScreenH() {
//         return this.getNestedHeight() * this.ng.mmHeight * this.ng.mmScale;
//     }

//     getScreenHeight() {
//         if (!this.ng.mmDisplay) {
//             return 1;
//         }
//         super.getScreenHeight();
//     }

//     getScreenLocation() {
//         if (!this.ng.mmDisplay) {
//             return [1, 1];
//         }
//     }
// }
