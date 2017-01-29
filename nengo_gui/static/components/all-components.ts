import { Component } from "./component";
import { Value } from "./value";

export class AllComponents {
    uids: string[];
    components: Component[];
    values: Value[];

    constructor(){
         this.uids = [];
         this.components = [];
         this.values = [];
    }

    add(component: Component): void {
        this.components.push(component);
        this.uids.push(component.uid);
        if (component instanceof Value) {
            this.values.push(component);
        }
    }

    remove(component: Component): void {
        const index = this.components.indexOf(component);
        this.components.splice(index, 1);
        this.uids.splice(index, 1);
        if (component instanceof Value) {
            this.values.splice(this.values.indexOf(component), 1);
        }
    }

    byUID(uid: string): Component {
        return this.components[this.uids.indexOf(uid)];
    }

    onResize(widthScale: number, heightScale: number): void {
        this.components.forEach(component => {
            component.onResize(
                component.width * widthScale, component.height * heightScale);
        });
    }

    redraw() {
        this.components.forEach(component => {
            component.redrawSize();
            component.redrawPos();
        });
    }

    rescale(widthScale, heightScale) {
        this.components.forEach(component => {
            component.w *= widthScale;
            component.h *= heightScale;
        });
    }

    saveLayouts(): void {
        this.components.forEach(component => {
            component.saveLayout();
        });
    }

    /**
     * Return simulation data as a csv-formatted string.
     *
     * Only simulation data from Value components is included,
     * and only for the amount of time kept in the simulation, which is
     * managed by the DataStore.
     */
    toCSV(): string {

        const data = [];
        const csv = [];

        // Extract all the data from the value components
        for (let i = 0; i < this.values.length; i++) {
            data.push(this.values[i].dataStore.data);
        }

        // Grabs all the time steps
        const times = this.values[0].dataStore.times;

        // Headers for the csv file
        csv.push(["Graph Name"]);
        csv.push(["Times"]);

        // TODO: replace for-loops with iterators
        // Adds ensemble name and appropriate number of spaces to the header
        for (let i = 0; i < this.values.length; i++) {
            csv[0].push(this.values[i].label.innerHTML);
            for (let j = 0; j < data[i].length - 1; j++) {
                csv[0].push([]);
            }
        }

        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < data[i].length; j++) {
                csv[1].push("Dimension" + (j + 1));
            }
        }

        // Puts the data at each time step into a row in the csv
        for (let i = 0; i < times.length; i++) {
            const tempArr = [times[i]];
            for (let j = 0; j < data.length; j++) {
                for (let k = 0; k < data[j].length; k++) {
                    tempArr.push(data[j][k][i]);
                }
            }
            csv.push(tempArr);
        }

        // Turns the array into a CSV string
        csv.forEach((elem, index) => {
            csv[index] = elem.join(",");
        });
        return csv.join("\n");
    }
}
