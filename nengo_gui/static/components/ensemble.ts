import * as interact from "interact.js";

import { Position, ResizableComponent } from "./base";
import { registerComponent } from "./registry";
import { Connection } from "../server";
import { EnsembleView } from "./views/ensemble";

export class Ensemble extends ResizableComponent {
    protected _view: EnsembleView;

    constructor({
        server,
        uid,
        pos,
        dimensions
    }: {
        server: Connection;
        uid: string;
        pos: Position;
        dimensions: number;
    }) {
        super(server, uid, pos.left, pos.top, pos.width, pos.height, dimensions);
    }

    get resizeOptions(): any {
        const options: any = {};
        for (const option in ResizableComponent.resizeOptions) {
            options[option] = ResizableComponent.resizeOptions[option];
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
        this.menu.addAction(
            "XY-value",
            () => {
                this.createGraph("XYValue");
            },
            () => this.dimensions > 1
        );
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
            // TODO
            // this.createModal();
        });
    }
}

registerComponent("ensemble", Ensemble);
