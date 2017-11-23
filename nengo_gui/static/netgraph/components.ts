import { Component } from "../components/component";
import { Network } from "../components/network";
import { Widget } from "../components/widget";
import * as utils from "../utils";

export class ComponentManager {
    components: Array<Component> = [];
    // TODO: Make top-level netgraph network a network
    networks: { [uid: string]: Network | null } = {};
    widgets: Array<Widget> = [];

    get length(): number {
        return this.components.length;
    }

    add(component: Component, network: Network = null) {
        this.components.push(component);
        this.networks[component.uid] = network;
        if (component instanceof Widget) {
            this.widgets.push(component);
        }
    }

    // get nestedHeight() {
    //     let h = this.height;
    //     let parent = this.parent;
    //     while (parent !== null) {
    //         h *= parent.view.height * 2;
    //         parent = parent.view.parent;
    //     }
    //     return h;
    // }

    // get nestedWidth() {
    //     let w = this.width;
    //     let parent = this.parent;
    //     while (parent !== null) {
    //         w *= parent.view.width * 2;
    //         parent = parent.view.parent;
    //     }
    //     return w;
    // }

    onresize = utils.throttle(
        (widthScale: number, heightScale: number): void => {
            // for (const uid in this.components) {
            //     const component = this.components[uid];
            //     // TODO: Set component scaleToPixels
            //     // component.onresize(
            //     //     component.width * widthScale, component.height * heightScale,
            //     // );
            // }
        },
        66
    );

    remove(component: Component) {
        // First, remove all children ???
        const index = this.components.indexOf(component);
        this.components.splice(index, 1);
    }

    saveLayouts() {
        this.components.forEach(component => {
            // TODO: layout?
            // component.saveLayout();
        });
    }

    scale(factor: number) {
        this.components.forEach(component => {
            component.scale(factor);
        });
    }

    toCSV(): string {
        const data = [];
        const csv = [];

        // Extract all the data from the value components
        this.widgets.forEach(widget => {
            data.push(widget.datastore.data);
        });

        // Grabs all the time steps
        const times = this.widgets[0].datastore.times;

        // Headers for the csv file
        csv.push(["Graph Name"]);
        csv.push(["Times"]);

        // Adds ensemble name and appropriate number of spaces to the header
        this.widgets.forEach((value, i) => {
            csv[0].push(value.uid);
            data[i].forEach(() => {
                csv[0].push([]);
            });
        });

        data.forEach(dims => {
            dims.forEach((dim, i) => {
                csv[1].push(`Dimension ${i + 1}`);
            });
        });

        // Puts the data at each time step into a row in the csv
        times.forEach((time, timeIx) => {
            const row = [time];
            data.forEach((dims, dimsIx) => {
                dims.forEach((dim, dimIx) => {
                    row.push(data[dimsIx][dimIx][timeIx]);
                });
            });
            csv.push(row);
        });

        // Turns the array into a CSV string
        csv.forEach((elem, i) => {
            csv[i] = elem.join(",");
        });
        return csv.join("\n");
    }
}
