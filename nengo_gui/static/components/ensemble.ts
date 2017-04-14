import * as interact from "interact.js";

import { ResizableModelObj } from "./base";
import { EnsembleView } from "./views/ensemble";

export class Ensemble extends ResizableModelObj {
    protected _view: EnsembleView;

    get resizeOptions(): any {
        const options: any = {};
        for (const option in ResizableModelObj.resizeOptions) {
            options[option]= ResizableModelObj.resizeOptions[option];
        }
        options.invert = "reposition";
        options.square = true;
        return options;
    }

    get view(): EnsembleView {
        if (this._view === null) {
            this._view = new EnsembleView("?");
        }
        return this._view;
    }

    addMenuItems() {
        this.menu.addAction("Value", () => {
            this.createGraph("Value");
        });
        this.menu.addAction("XY-value", () => {
            this.createGraph("XYValue");
        }, () => this.dimensions > 1);
        this.menu.addAction("Spikes", () => {
            this.createGraph("Raster");
        });
        this.menu.addAction("Voltages", () => {
            this.createGraph("Voltage");
        });
        this.menu.addAction("Firing pattern", () => {
            this.createGraph("SpikeGrid");
        });
        this.menu.addAction("Details ...", () => {
            this.createModal();
        });
    }
}
