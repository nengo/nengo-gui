import { Component } from "./component";
import { Value } from "./value";

const uids: string[] = [];
const components: Component[] = [];
const values: Value[] = [];

export function add(component: Component): void {
    components.push(component);
    uids.push(component.uid);
    if (component instanceof Value) {
        values.push(component);
    }
}

export function remove(component: Component): void {
    const index = components.indexOf(component);
    components.splice(index, 1);
    uids.splice(index, 1);
    if (component instanceof Value) {
        values.splice(values.indexOf(component), 1);
    }
}

export function byUID(uid: string): Component {
    return components[uids.indexOf(uid)];
}

export function onResize(widthScale: number, heightScale: number): void {
    components.forEach(component => {
        component.onResize(
            component.width * widthScale, component.height * heightScale);
    });
}

export function redraw() {
    components.forEach(component => {
        component.redrawSize();
        component.redrawPos();
    });
}

export function rescale(widthScale, heightScale) {
    components.forEach(component => {
        component.w *= widthScale;
        component.h *= heightScale;
    });
}

export function saveLayouts(): void {
    components.forEach(component => {
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
export function toCSV(): string {

    const data = [];
    const csv = [];

    // Extract all the data from the value components
    for (let i = 0; i < values.length; i++) {
        data.push(values[i].dataStore.data);
    }

    // Grabs all the time steps
    const times = values[0].dataStore.times;

    // Headers for the csv file
    csv.push(["Graph Name"]);
    csv.push(["Times"]);

    // Adds ensemble name and appropriate number of spaces to the header
    for (let i = 0; i < values.length; i++) {
        csv[0].push(values[i].label.innerHTML);
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
