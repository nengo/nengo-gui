import { ModelObj, ResizableModelObj } from "./base";
import { NodeView, PassthroughNodeView } from "./views/node";

export class PassthroughNode extends ModelObj {
    fixedHeight: number;
    fixedWidth: number;

    protected _view: PassthroughNodeView;

    get view(): PassthroughNodeView {
        if (this._view === null) {
            this._view = new PassthroughNodeView("?");
        }
        return this._view;
    }
}

export class Node extends ResizableModelObj {
    htmlNode;

    protected _view: NodeView;

    get view(): NodeView {
        if (this._view === null) {
            this._view = new NodeView("?");
        }
        return this._view;
    }

    addMenuItems() {
        this.menu.addAction("Slider", () => {
            this.createGraph("Slider");
        });
        this.menu.addAction("Value", () => {
            this.createGraph("Value");
        }, () => this.dimensions > 0);
        this.menu.addAction("XY-value", () => {
            this.createGraph("XYValue");
        }, () => this.dimensions > 1);
        this.menu.addAction("HTML", () => {
            this.createGraph("HTMLView");
        }, () => this.htmlNode);
        this.menu.addAction("Details ...", () => {
            this.createModal();
        });
    }
}
