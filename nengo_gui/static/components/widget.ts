import { Component, ComponentView } from "./component";
import { DataStore, TypedArray } from "../datastore";
import { InputDialogView } from "../modal";
import { Position } from "./position";
import {
    Connection,
    FastConnection,
    FastServerConnection,
    MockFastConnection,
    MockConnection
} from "../server";
import * as utils from "../utils";

export abstract class Widget extends Component {
    currentTime: number = 0.0;
    datastore: DataStore;
    synapse: number;

    protected fastServer: FastConnection;

    constructor(
        server: Connection,
        uid: string,
        view: ComponentView,
        label: string,
        pos: Position,
        dimensions: number,
        synapse: number,
        labelVisible: boolean = true
    ) {
        super(server, uid, view, label, pos, labelVisible);
        this.synapse = synapse;
        this.datastore = new DataStore(dimensions, 0.0);
        if (server instanceof MockConnection) {
            // If server is mocked, mock the fast connection too
            this.fastServer = new MockFastConnection(this.uid);
        } else {
            this.fastServer = new FastServerConnection(this.uid);
        }

        window.addEventListener(
            "TimeSlider.moveShown",
            utils.throttle((e: CustomEvent) => {
                this.currentTime = e.detail.shownTime[1];
            }, 50) // Update once every 50 ms
        );
    }

    get dimensions(): number {
        return this.datastore.dims;
    }

    set dimensions(val: number) {
        console.warn(`Changing dimensionality of ${this.uid}`);
        this.datastore.dims = val;
    }

    /**
     * Receive new line data from the server.
     */
    add(data: number[] | TypedArray) {
        // TODO: handle this in the websocket code
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
