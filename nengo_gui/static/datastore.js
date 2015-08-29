/**
 * Storage of a set of data points and associated times.
 * @constructor
 *
 * @param {int} dims - number of data points per time
 * @param {Nengo.SimControl} sim - the simulation controller
 * @param {float} synapse - the filter to apply to the data
 */
Nengo.DataStore = function(dims, sim, synapse) {
    this.synapse = synapse; /** TODO: get from Nengo.SimControl */
    this.sim = sim;
    this.times = []
    this.data = [];
    for (var i=0; i < dims; i++) {
        this.data.push([]);
    }
}

/**
 * Add a set of data.
 * @param {array} row - dims+1 data points, with time as the first one
 */
Nengo.DataStore.prototype.push = function(row) {
    /** if you get data out of order, wipe out the later data */
    if (row[0] < this.times[this.times.length - 1]) {
        var index = 0;
        while (this.times[index] < row[0]) {
            index += 1;
        }

        var dims = this.data.length;
        this.times.splice(index, this.times.length);
        for (var i=0; i < this.data.length; i++) {
            this.data[i].splice(index, this.data[i].length);
        }
    }


    /** compute lowpass filter (value = value*decay + new_value*(1-decay) */
    var decay = 0.0;
    if ((this.times.length != 0) && (this.synapse > 0)) {
        var dt = row[0] - this.times[this.times.length - 1];
        decay = Math.exp(-dt / this.synapse);
    }


    /** put filtered values into data array */
    for (var i = 0; i < this.data.length; i++) {
        if (decay == 0.0) {
            this.data[i].push(row[i + 1]);
        } else {
            this.data[i].push(row[i + 1] * (1-decay) +
                              this.data[i][this.data[i].length - 1] * decay);
        }
    }
    /** store the time as well */
    this.times.push(row[0]);
};

/**
 * Reset the data storage.  This will clear current data so there is
 * nothing to display on a reset event.
 */
Nengo.DataStore.prototype.reset = function() {
    var index = 0;
    var dims = this.data.length;
    this.times.splice(index, this.times.length);
    for (var i=0; i < this.data.length; i++) {
        this.data[i].splice(index, this.data[i].length);
    }
}

/**
 * update the data storage.  This should be call periodically (before visual
 * updates, but not necessarily after every push()).  Removes old data outside
 * the storage limit set by the Nengo.SimControl.
 */
Nengo.DataStore.prototype.update = function() {
    /** figure out how many extra values we have (values whose time stamp is
     * outside the range to keep)
     */
    var extra = 0;
    var limit = this.sim.time_slider.last_time -
                this.sim.time_slider.kept_time;
    while (this.times[extra] < limit) {
        extra += 1;
    }

    /** remove the extra data */
    if (extra > 0) {
        this.times = this.times.slice(extra);
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = this.data[i].slice(extra);
        }
    }
}

/**
 * Return just the data that is to be shown
 */
Nengo.DataStore.prototype.get_shown_data = function() {
    /* determine time range */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    /* find the corresponding index values */
    var index = 0;
    while (this.times[index] < t1) {
        index += 1;
    }
    var last_index = index;
    while (this.times[last_index] < t2 && last_index < this.times.length) {
        last_index += 1;
    }
    this.first_shown_index = index;

    /** return the visible slice of the data */
    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i].slice(index, last_index));
    }
    return shown;
}

Nengo.DataStore.prototype.is_at_end = function() {
    var ts = this.sim.time_slider;
    return (ts.last_time < ts.first_shown_time + ts.shown_time + 0.000000001);
}


Nengo.DataStore.prototype.get_last_data = function() {
    /* determine time range */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    /* find the corresponding index values */
    var last_index = 0;
    while (this.times[last_index] < t2 && last_index < this.times.length - 1) {
        last_index += 1;
    }

    /** return the visible slice of the data */
    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i][last_index]);
    }
    return shown;
}
