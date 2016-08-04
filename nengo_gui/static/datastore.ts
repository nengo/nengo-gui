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

constructor(dims, sim, synapse) {
    this.synapse = synapse; // TODO: get from SimControl
    this.sim = sim;
    this.times = [];
    this.data = [];
    for (var i = 0; i < dims; i++) {
        this.data.push([]);
    }
};

/**
 * Add a set of data.
 *
 * @param {array} row - dims+1 data points, with time as the first one
 */
push(row) {
    // If you get data out of order, wipe out the later data
    if (row[0] < this.times[this.times.length - 1]) {
        var index = 0;
        while (this.times[index] < row[0]) {
            index += 1;
        }

        var dims = this.data.length;
        this.times.splice(index, this.times.length);
        for (var i = 0; i < this.data.length; i++) {
            this.data[i].splice(index, this.data[i].length);
        }
    }

    // Compute lowpass filter (value = value*decay + new_value*(1-decay)
    var decay = 0.0;
    if ((this.times.length != 0) && (this.synapse > 0)) {
        var dt = row[0] - this.times[this.times.length - 1];
        decay = Math.exp(-dt / this.synapse);
    }

    // Put filtered values into data array
    for (var i = 0; i < this.data.length; i++) {
        if (decay == 0.0) {
            this.data[i].push(row[i + 1]);
        } else {
            this.data[i].push(row[i + 1] * (1 - decay) +
                              this.data[i][this.data[i].length - 1] * decay);
        }
    }
    // Store the time as well
    this.times.push(row[0]);
};

/**
 * Reset the data storage.
 *
 * This will clear current data so there is
 * nothing to display on a reset event.
 */
reset() {
    var index = 0;
    this.times.splice(index, this.times.length);
    for (var i = 0; i < this.data.length; i++) {
        this.data[i].splice(index, this.data[i].length);
    }
};

/**
 * Update the data storage.
 *
 * This should be call periodically (before visual updates, but not necessarily
 * after every push()).  Removes old data outside the storage limit set by
 * the SimControl.
 */
update() {
    // Figure out how many extra values we have (values whose time stamp is
    // outside the range to keep)
    var extra = 0;
    // How much has the most recent time exceeded how much is allowed to be kept
    var limit = this.sim.time_slider.last_time -
                this.sim.time_slider.kept_time;
    while (this.times[extra] < limit) {
        extra += 1;
    }

    // Remove the extra data
    if (extra > 0) {
        this.times = this.times.slice(extra);
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = this.data[i].slice(extra);
        }
    }
};

/**
 * Return just the data that is to be shown.
 */
get_shown_data() {
    // Determine time range
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    // Find the corresponding index values
    var index = 0;
    while (this.times[index] < t1) {
        index += 1;
    }
    var last_index = index;
    while (this.times[last_index] < t2 && last_index < this.times.length) {
        last_index += 1;
    }
    this.first_shown_index = index;

    // Return the visible slice of the data
    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i].slice(index, last_index));
    }
    return shown;
};

is_at_end() {
    var ts = this.sim.time_slider;
    return (ts.last_time < ts.first_shown_time + ts.shown_time + 1e-9);
};

get_last_data() {
    // Determine time range
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    // Find the corresponding index values
    var last_index = 0;
    while (this.times[last_index] < t2 && last_index < this.times.length - 1) {
        last_index += 1;
    }

    // Return the visible slice of the data
    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i][last_index]);
    }
    return shown;
};

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

constructor (dims, sim, synapse) {
    super(dims, sim, synapse);

    this._dims = dims;

    Object.defineProperty(this, "dims", {
        get: function() {
            return this._dims;
        },
        set: function(dim_val) {
            // Throw a bunch of errors if bad things happen.
            // Assuming you can only grow dims and not shrink them...
            if (this._dims < dim_val) {
                for (var i = 0; i < dim_val - this._dims; i++) {
                    this.data.push([]);
                }
            } else if (this._dims > dim_val) {
                throw "can't decrease size of datastore";
            }
            this._dims = dim_val;
        }
    });
};

get_offset() {
    var offset = [];
    offset.push(0);

    for (var i = 1; i < this._dims; i++) {
        if (this.data[i] === undefined) {
            offset.push(this.data[0].length);
        } else {
            offset.push(this.data[0].length - this.data[i].length);
        }
    }

    return offset;
};

/**
 * Add a set of data.
 *
 * @param {array} row - dims+1 data points, with time as the first one
 */
push(row) {
    // Get the offsets
    var offset = this.get_offset();

    // If you get data out of order, wipe out the later data
    if (row[0] < this.times[this.times.length - 1]) {
        var index = 0;
        while (this.times[index] < row[0]) {
            index += 1;
        }

        this.times.splice(index, this.times.length);
        for (var i = 0; i < this._dims; i++) {
            if (index - offset[i] >= 0) {
                this.data[i].splice(index - offset[i], this.data[i].length);
            }
        }
    }

    // Compute lowpass filter (value = value*decay + new_value*(1-decay)
    var decay = 0.0;
    if ((this.times.length != 0) && (this.synapse > 0)) {
        var dt = row[0] - this.times[this.times.length - 1];
        decay = Math.exp(-dt / this.synapse);
    }

    // Put filtered values into data array
    for (var i = 0; i < this._dims; i++) {
        if (decay == 0.0 || this.data[i].length === 0) {
            this.data[i].push(row[i + 1]);
        } else {
            this.data[i].push(row[i + 1] * (1 - decay) +
                              this.data[i][this.data[i].length - 1] * decay);
        }
    }
    // Store the time as well
    this.times.push(row[0]);
};

/**
 * Reset dimensions before resetting the datastore.
 */
reset() {
    console.log("resetting growable");
    this._dims = 1;
    DataStore.call(this, this._dims, this.sim, this.synapse);
};

/**
 * Update the data storage.
 *
 * This should be call periodically (before visual updates, but not necessarily
 * after every push()).  Removes old data outside the storage limit set by
 * the SimControl.
 */
update() {
    // Figure out how many extra values we have (values whose time stamp is
    // outside the range to keep)
    var offset = this.get_offset();
    var extra = 0;
    var limit = this.sim.time_slider.last_time -
                this.sim.time_slider.kept_time;
    while (this.times[extra] < limit) {
        extra += 1;
    }

    // Remove the extra data
    if (extra > 0) {
        this.times = this.times.slice(extra);
        for (var i = 0; i < this.data.length; i++) {
            if (extra - offset[i] >= 0) {
                this.data[i] = this.data[i].slice(extra - offset[i]);
            }
        }
    }
};

/**
 * Return just the data that is to be shown.
 */
get_shown_data() {
    var offset = this.get_offset();
    // Determine time range
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    // Find the corresponding index values
    var index = 0;
    while (this.times[index] < t1) {
        index += 1;
    }
    // Logically, you should start the search for the
    var last_index = index;
    while (this.times[last_index] < t2 && last_index < this.times.length) {
        last_index += 1;
    }
    this.first_shown_index = index;

    // Return the visible slice of the data
    var shown = [];
    var nan_number = 0;
    var slice_start = 0;
    for (var i = 0; i < this._dims; i++) {

        if (last_index > offset[i] && offset[i] !== 0) {

            if (index < offset[i]) {
                nan_number = offset[i] - index;
                slice_start = 0;
            } else {
                nan_number = 0;
                slice_start = index - offset[i];
            }

            shown.push(
                Array.apply(null, Array(nan_number)).map(function() {
                    return "NaN";
                }).concat(
                    this.data[i].slice(slice_start, last_index - offset[i])
                ));

        } else {

            shown.push(this.data[i].slice(index, last_index));

        }
    }

    return shown;
};

get_last_data() {
    var offset = this.get_offset();
    // Determine time range
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    // Find the corresponding index values
    var last_index = 0;
    while (this.times[last_index] < t2 && last_index < this.times.length - 1) {
        last_index += 1;
    }

    // Return the visible slice of the data
    var shown = [];
    for (var i = 0; i < this._dims; i++) {
        if (last_index - offset[i] >= 0) {
            shown.push(this.data[i][last_index - offset[i]]);
        }
    }
    return shown;
};

}
