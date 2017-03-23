import * as d3 from "d3";
import * as $ from "jquery";

import * as allComponents from "./components/all-components";
import { config } from "./config";
import * as tooltips from "./tooltips";
import * as utils from "./utils";
import { InputDialogView, ModalView } from "./views/modal";

export class Modal {
    $body;
    $div;
    $footer;
    $title;
    editor;
    hotkeys;
    netgraph;
    sim;
    simWasRunning;
    toolbar;
    view: ModalView = null; // Created in this.show

    constructor($div, editor, sim) {
        // this.$div = $div;
        // this.$title = this.$div.find(".modal-title").first();
        // this.$footer = this.$div.find(".modal-footer").first();
        // this.$body = this.$div.find(".modal-body").first();
        this.editor = editor;
        this.sim = sim;
        this.netgraph = this.editor.netgraph;

        this.simWasRunning = false;

        // This listener is triggered when the modal is closed
        this.$div.on("hidden.bs.modal", function() {
            if (this.simWasRunning) {
                this.sim.play();
            }
            this.hotkeys.setActive(true);
        });
    }

    show() {
        // TODO: get the hotkeys and deactivate
        // this.hotkeys.setActive(false);
        this.simWasRunning = !this.sim.paused;
        this.sim.pause();
        this.view = new ModalView();
        this.view.show();
    }
}
