import { ResizableComponent } from "./component";
import { DataStore } from "../datastore";
import { InputDialogView } from "../modal";
import { Connection } from "../server";
import * as utils from "../utils";

export abstract class Widget extends ResizableComponent {
    currentTime: number = 0.0;
    datastore: DataStore;
    synapse: number;

    constructor(
        server: Connection,
        uid: string,
        left: number,
        top: number,
        width: number,
        height: number,
        dimensions: number,
        synapse: number
    ) {
        super(server, uid, left, top, width, height, dimensions);
        this.synapse = synapse;
        this.datastore = new DataStore(this.dimensions, 0.0);

        window.addEventListener(
            "TimeSlider.moveShown",
            utils.throttle((e: CustomEvent) => {
                this.currentTime = e.detail.shownTime[1];
            }, 50) // Update once every 50 ms
        );
    }

    /**
     * Receive new line data from the server.
     */
    add(data: number[]) {
        // TODO: handle this in the websocket code
        // const size = this.dimensions + 1;
        // // Since multiple data packets can be sent with a single event,
        // // make sure to process all the packets.
        // while (data.length >= size) {
        //     this.datastore.push(data.slice(0, size));
        //     data = data.slice(size);
        // }
        // if (data.length > 0) {
        //     console.warn("extra data: " + data.length);
        // }
        if (data.length !== this.dimensions + 1) {
            console.error(
                `Got data with ${data.length - 1} dimensions; ` +
                    `should be ${this.dimensions} dimensions.`
            );
        } else {
            this.datastore.add(data);
            this.syncWithDataStore();
        }
    }

    addMenuItems() {
        this.menu.addAction("Set synapse...", () => {
            this.askSynapse();
        });
        this.menu.addAction(
            "Hide label",
            () => {
                this.labelVisible = false;
                // see component.interactRoot.on("dragend resizeend")
                // this.saveLayout();
            },
            () => this.labelVisible
        );
        this.menu.addAction(
            "Show label",
            () => {
                this.labelVisible = true;
                // see component.interactRoot.on("dragend resizeend")
                // this.saveLayout();
            },
            () => !this.labelVisible
        );
        // TODO: attachNetGraph
        // this.menu.addAction("Remove", () => { this.remove(); });

        super.addMenuItems();
    }

    askSynapse() {
        const modal = new InputDialogView(
            String(this.synapse),
            "Synaptic filter time constant (in seconds)",
            "Input should be a non-negative number"
        );
        modal.title = "Set synaptic filter...";
        modal.ok.addEventListener("click", () => {
            const validator = $(modal).data("bs.validator");
            validator.validate();
            if (validator.hasErrors() || validator.isIncomplete()) {
                return;
            }
            if (modal.input.value !== null) {
                const newSynapse = parseFloat(modal.input.value);
                if (newSynapse !== this.synapse) {
                    this.synapse = newSynapse;
                    // this.ws.send("synapse:" + this.synapse);
                }
            }
            $(modal).modal("hide");
        });
        utils.handleTabs(modal);

        $(modal).validator({
            custom: {
                ngvalidator: item => {
                    return utils.isNum(item.value) && Number(item.value) >= 0;
                }
            }
        });
        $(modal.root).on("hidden.bs.modal", () => {
            document.body.removeChild(modal.root);
        });
        document.body.appendChild(modal.root);
        modal.show();
    }

    reset() {
        this.datastore.reset();
    }

    syncWithDataStore: () => void;
}
