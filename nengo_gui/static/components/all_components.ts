import Component from "./component";
import Value from "./value";

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

export function by_uid(uid: string): Component {
    return components[uids.indexOf(uid)];
}

export function on_resize(width_scale: number, height_scale: number): void {
    components.forEach(component => {
        component.on_resize(
            component.width * width_scale, component.height * height_scale);
    });
}

export function redraw() {
    components.forEach(component => {
        component.redraw_size();
        component.redraw_pos();
    });
}

export function rescale(width_scale, height_scale) {
    components.forEach(component => {
        component.w *= width_scale;
        component.h *= height_scale;
    });
}

export function save_layouts(): void {
    components.forEach(component => {
        component.save_layout();
    });
}

/**
 * Return simulation data as a csv-formatted string.
 *
 * Only simulation data from Value components is included,
 * and only for the amount of time kept in the simulation, which is
 * managed by the DataStore.
 */
export function to_csv(): string {

    const data = [];
    const csv = [];

    // Extract all the data from the value components
    for (let i = 0; i < values.length; i++) {
        data.push(values[i].data_store.data);
    }

    // Grabs all the time steps
    const times = values[0].data_store.times;

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
        const temp_arr = [times[i]];
        for (let j = 0; j < data.length; j++) {
            for (let k = 0; k < data[j].length; k++) {
                temp_arr.push(data[j][k][i]);
            }
        }
        csv.push(temp_arr);
    }

    // Turns the array into a CSV string
    csv.forEach((elem, index) => {
        csv[index] = elem.join(",");
    });
    return csv.join("\n");
}
