/**
 * Storage of a set of data points and associated times with a fixed
 * number of dimensions.
 *
 * @constructor
 * @param {int} dims - number of data points per time
 * @param {SimControl} sim - the simulation controller
 * @param {float} synapse - the filter to apply to the data
 */
import { TimeSlider } from "./sim-control";

export class DataStore {
    data;
    firstShownIndex;
    timeSlider;
    synapse;
    times;

    constructor(dims, timeSlider, synapse) {
        this.synapse = synapse; // TODO: get from SimControl
        this.timeSlider = timeSlider;
        this.times = [];
        this.data = [];
        for (let i = 0; i < dims; i++) {
            this.data.push([]);
        }
    }

    /**
     * Add a set of data.
     *
     * @param {array} row - dims+1 data points, with time as the first one
     */
    push(row) {
        // If you get data out of order, wipe out the later data
        if (row[0] < this.times[this.times.length - 1]) {
            let index = 0;
            while (this.times[index] < row[0]) {
                index += 1;
            }

            this.times.splice(index, this.times.length);

            this.data.forEach(dimdata => {
                dimdata.splice(index, dimdata.length);
            });
        }

        // Compute lowpass filter (value = value*decay + newValue*(1-decay)
        let decay = 0.0;
        if ((this.times.length !== 0) && (this.synapse > 0)) {
            const dt = row[0] - this.times[this.times.length - 1];
            decay = Math.exp(-dt / this.synapse);
        }

        // Put filtered values into data array
        for (let i = 0; i < this.data.length; i++) {
            if (decay === 0.0) {
                this.data[i].push(row[i + 1]);
            } else {
                this.data[i].push(
                    row[i + 1] * (1 - decay) +
                        this.data[i][this.data[i].length - 1] * decay);
            }
        }
        // Store the time as well
        this.times.push(row[0]);
    }

    /**
     * Reset the data storage.
     *
     * This will clear current data so there is
     * nothing to display on a reset event.
     */
    reset() {
        this.times.splice(0, this.times.length);
        this.data.forEach(dimdata => {
            dimdata.splice(0, dimdata.length);
        });
    }

    /**
     * Update the data storage.
     *
     * This should be called periodically (before visual updates, but not
     * necessarily after every push()).  Removes old data outside the storage
     * limit set by the SimControl.
     */
    update() {
        // Figure out how many extra values we have (values whose time stamp is
        // outside the range to keep)
        let extra = 0;
        // How much has the most recent time exceeded how much is kept?
        const limit = this.timeSlider.currentTime - this.timeSlider.keptTime;
        while (this.times[extra] < limit) {
            extra += 1;
        }

        // Remove the extra data
        if (extra > 0) {
            this.times = this.times.slice(extra);
            for (let i = 0; i < this.data.length; i++) {
                this.data[i] = this.data[i].slice(extra);
            }
        }
    }

    /**
     * Return just the data that is to be shown.
     */
    getShownData() {
        // Determine time range
        const t1 = this.timeSlider.firstShownTime;
        const t2 = t1 + this.timeSlider.shownTime;

        // Find the corresponding index values
        let index = 0;
        while (this.times[index] < t1) {
            index += 1;
        }
        let lastIndex = index;
        while (this.times[lastIndex] < t2 && lastIndex < this.times.length) {
            lastIndex += 1;
        }
        this.firstShownIndex = index;

        // Return the visible slice of the data
        const shown = [];
        this.data.forEach(dimdata => {
            shown.push(dimdata.slice(index, lastIndex));
        });
        return shown;
    }

    isAtEnd() {
        const ts = this.timeSlider;
        return (ts.currentTime < ts.firstShownTime + ts.shownTime + 1e-9);
    }

    getLastData() {
        // Determine time range
        const t1 = this.timeSlider.firstShownTime;
        const t2 = t1 + this.timeSlider.shownTime;

        // Find the corresponding index values
        let lastIndex = 0;
        while (this.times[lastIndex] < t2
                   && lastIndex < this.times.length - 1) {
            lastIndex += 1;
        }

        // Return the visible slice of the data
        const shown = [];
        this.data.forEach(dimdata => {
            shown.push(dimdata[lastIndex]);
        });
        return shown;
    }

}

/**
 * Storage of a set of data points and associated times with an increasable
 * number of dimensions.
 *
 * @constructor
 * @param {int} dims - number of data points per time
 * @param {SimControl} sim - the simulation controller
 * @param {float} synapse - the filter to apply to the data
 */
export class GrowableDataStore extends DataStore {
    _dims;

    constructor (dims, sim, synapse) {
        super(dims, sim, synapse);

        this._dims = dims;
    }

    get dims() {
        return this._dims;
    }

    set dims(dimVal) {
        // Throw a bunch of errors if bad things happen.
        // Assuming you can only grow dims and not shrink them...
        if (this._dims < dimVal) {
            for (let i = 0; i < dimVal - this._dims; i++) {
                this.data.push([]);
            }
        } else if (this._dims > dimVal) {
            throw "can't decrease size of datastore";
        }
        this._dims = dimVal;
    }

    getOffset() {
        const offset = [0];

        for (let i = 1; i < this._dims; i++) {
            if (this.data[i] === undefined) {
                offset.push(this.data[0].length);
            } else {
                offset.push(this.data[0].length - this.data[i].length);
            }
        }

        return offset;
    }

    /**
     * Add a set of data.
     *
     * @param {array} row - dims+1 data points, with time as the first one
     */
    push(row) {
        // Get the offsets
        const offset = this.getOffset();

        // If you get data out of order, wipe out the later data
        if (row[0] < this.times[this.times.length - 1]) {
            let index = 0;
            while (this.times[index] < row[0]) {
                index += 1;
            }

            this.times.splice(index, this.times.length);
            for (let i = 0; i < this._dims; i++) {
                if (index - offset[i] >= 0) {
                    this.data[i].splice(index - offset[i], this.data[i].length);
                }
            }
        }

        // Compute lowpass filter (value = value*decay + newValue*(1-decay)
        let decay = 0.0;
        if ((this.times.length !== 0) && (this.synapse > 0)) {
            const dt = row[0] - this.times[this.times.length - 1];
            decay = Math.exp(-dt / this.synapse);
        }

        // Put filtered values into data array
        for (let i = 0; i < this._dims; i++) {
            if (decay === 0.0 || this.data[i].length === 0) {
                this.data[i].push(row[i + 1]);
            } else {
                this.data[i].push(
                    row[i + 1] * (1 - decay) +
                        this.data[i][this.data[i].length - 1] * decay);
            }
        }
        // Store the time as well
        this.times.push(row[0]);
    }

    /**
     * Update the data storage.
     *
     * This should be call periodically (before visual updates, but not
     * necessarily after every push()).  Removes old data outside the storage
     * limit set by the SimControl.
     */
    update() {
        // Figure out how many extra values we have (values whose time stamp is
        // outside the range to keep)
        const offset = this.getOffset();
        let extra = 0;
        const limit = this.timeSlider.currentTime - this.timeSlider.keptTime;
        while (this.times[extra] < limit) {
            extra += 1;
        }

        // Remove the extra data
        if (extra > 0) {
            this.times = this.times.slice(extra);
            for (let i = 0; i < this.data.length; i++) {
                if (extra - offset[i] >= 0) {
                    this.data[i] = this.data[i].slice(extra - offset[i]);
                }
            }
        }
    }

    /**
     * Return just the data that is to be shown.
     */
    getShownData() {
        const offset = this.getOffset();
        // Determine time range
        const t1 = this.timeSlider.firstShownTime;
        const t2 = t1 + this.timeSlider.shownTime;

        // Find the corresponding index values
        let index = 0;
        while (this.times[index] < t1) {
            index += 1;
        }
        // Logically, you should start the search for the
        let lastIndex = index;
        while (this.times[lastIndex] < t2 && lastIndex < this.times.length) {
            lastIndex += 1;
        }
        this.firstShownIndex = index;

        // Return the visible slice of the data
        const shown = [];
        for (let i = 0; i < this._dims; i++) {
            let nanNumber;
            let sliceStart;

            if (lastIndex > offset[i] && offset[i] !== 0) {

                if (index < offset[i]) {
                    nanNumber = offset[i] - index;
                    sliceStart = 0;
                } else {
                    nanNumber = 0;
                    sliceStart = index - offset[i];
                }

                shown.push(
                    Array.apply(null, Array(nanNumber)).map(() => {
                        return "NaN";
                    }).concat(
                        this.data[i].slice(sliceStart, lastIndex - offset[i])
                    ));

            } else {

                shown.push(this.data[i].slice(index, lastIndex));

            }
        }

        return shown;
    }

    getLastData() {
        const offset = this.getOffset();
        // Determine time range
        const t1 = this.timeSlider.firstShownTime;
        const t2 = t1 + this.timeSlider.shownTime;

        // Find the corresponding index values
        let lastIndex = 0;
        while (this.times[lastIndex] < t2
                   && lastIndex < this.times.length - 1) {
            lastIndex += 1;
        }

        // Return the visible slice of the data
        const shown = [];
        for (let i = 0; i < this._dims; i++) {
            if (lastIndex - offset[i] >= 0) {
                shown.push(this.data[i][lastIndex - offset[i]]);
            }
        }
        return shown;
    }
}
