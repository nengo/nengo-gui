import { TimeSlider } from "./sim-control";

/**
 * Storage of a set of data points and associated times with a fixed
 * number of dimensions.
 *
 * @constructor
 * @param {int} dims - number of data points per time
 * @param {SimControl} sim - the simulation controller
 * @param {float} synapse - the filter to apply to the data
 */
export class DataStore {
    data: number[][] = [];
    times: number[] = [];
    synapse: number;

    constructor(dims: number, synapse: number) {
        this.synapse = synapse; // TODO: get from SimControl
        for (let i = 0; i < dims; i++) {
            this.data.push([]);
        }
    }

    get dims(): number {
        return this.data.length;
    }

    get points(): number {
        return this.data[0].length;
    }

    /**
     * Returns the index in `array` before `element`.
     *
     * This is helpful for determining where to insert an element,
     * and for finding indices between two elements.
     *
     * This method uses binary search to be much faster than the naive
     * approach of iterating through the array in order.
     * Note that this assumes that the array is sorted, but that is also true
     * if you were to search through it linearly.
     *
     * Returns 0 if element is less than all elements in array.
     */
    static indexBefore(array: number[], element: number) {
        let [low, high] = [0, array.length];

        while (high > low) {
            // Note: | 0 is a faster Math.floor
            const ix = (high + low) / 2 | 0;

            if (array[ix] <= element) {
                if (array[ix + 1] > element || ix + 1 === array.length) {
                    return ix
                } else {
                    low = ix + 1;
                }
            } else {
                high = ix;
            }
        }
        console.assert(low === 0 && high === 0);
        return 0;
    }

    dataAtIndex(index: number) {
        const sliced = [];
        this.data.forEach(dimdata => {
            sliced.push(dimdata[index]);
        });
        return sliced;
    }

    dataSlice(begin, end=undefined) {
        const sliced = [];
        this.data.forEach(dimdata => {
            sliced.push(dimdata.slice(begin, end));
        });
        return sliced;
    }

    getLastData(timeSlider: TimeSlider) {
        // Determine time range
        const t1 = timeSlider.firstShownTime;
        const t2 = t1 + timeSlider.shownTime;

        return this.dataAtIndex(DataStore.indexBefore(this.times, t2))
    }

    /**
     * Return just the data that is to be shown.
     */
    getShownData(timeSlider: TimeSlider) {
        // Determine time range
        const t1 = timeSlider.firstShownTime;
        const t2 = t1 + timeSlider.shownTime;

        // Find the corresponding index values
        const begin = DataStore.indexBefore(this.times, t1);
        const end = DataStore.indexBefore(this.times, t2);
        return this.dataSlice(begin, end+1);
    }

    /**
     * Add a set of data.
     *
     * @param {array} row - dims+1 data points, with time as the first one
     */
    push(row: number[]) {
        const [time, newdata] = [row[0], row.slice(1)];
        // If we get data out of order, wipe out the later data
        if (time < this.times[this.times.length - 1]) {
            this.splice(DataStore.indexBefore(this.times, time));
        }

        // Compute lowpass filter (value = value*decay + newValue*(1-decay)
        let decay = 0.0;
        if ((this.times.length > 0) && (this.synapse > 0)) {
            const dt = time - this.times[this.times.length - 1];
            decay = Math.exp(-dt / this.synapse);
        }

        // Put filtered values into data array
        if (decay === 0.0) {
            this.data.forEach((dimdata, dim) => {
                dimdata.push(newdata[dim]);
            });
        } else {
            this.data.forEach((dimdata, dim) => {
                if (dimdata[dimdata.length - 1] === null) {
                    dimdata.push(newdata[dim]);
                } else {
                    dimdata.push(newdata[dim] * (1 - decay) +
                                 dimdata[dimdata.length - 1] * decay);
                }
            });
        }
        // Store the time as well
        this.times.push(time);
    }

    /**
     * Reset the data storage.
     *
     * This will clear current data so there is
     * nothing to display on a reset event.
     */
    reset() {
        this.splice(0);
    }

    splice(...spliceargs) {
        this.times.splice(...spliceargs);
        this.data.forEach(dimdata => {
            dimdata.splice(...spliceargs);
        });
    }

    /**
     * Update the data storage.
     *
     * Removes old data outside the storage limit set by the SimControl.
     *
     * This should be called periodically (before visual updates, but not
     * necessarily after every push()).
     */
    update(timeSlider: TimeSlider) {
        // How much has the most recent time exceeded how much is kept?
        const limit = timeSlider.currentTime - timeSlider.keptTime;
        const extra = DataStore.indexBefore(this.times, limit);

        // Remove the extra data
        if (extra > 0) {
            this.splice(0, extra);
        }
    }
}

/**
 * Flexible storage of a set of data points and associated times.
 *
 * Flexibile storage means that the number of dimensions can be modified after
 * instantiation. If the number of dimensions increases, any missing values
 * will be filled in with `null`. If the number of dimensions decreases,
 * the last dimensions will be removed. If you wish to remove specific
 * dimensions, modify the `.data` property manually.
 *
 * @constructor
 * @param {int} dims - number of data points per time
 * @param {SimControl} sim - the simulation controller
 * @param {float} synapse - the filter to apply to the data
 */
export class FlexibleDataStore extends DataStore {
    get dims(): number {
        return this.data.length;
    }

    set dims(dimVal: number) {
        const nullArray = function(length: number) {
            return Array.apply(null, Array(length)).map(() => {return null;});
        }

        const prevDims = this.dims;
        if (prevDims < dimVal) {
            for (let i = prevDims; i < dimVal; i++) {
                this.data.push(nullArray(this.points));
            }
        } else if (prevDims > dimVal) {
            console.warn("Removed " + (prevDims - dimVal) + " dimension(s).");
            this.data.splice(dimVal);
        }
    }

    /**
     * Add a set of data.
     *
     * @param {array} row - dims+1 data points, with time as the first one
     */
    push(row: number[]) {
        const [time, newdata] = [row[0], row.slice(1)];
        if (newdata.length !== this.dims) {
            this.dims = newdata.length;
        }
        super.push(row);
    }
}
