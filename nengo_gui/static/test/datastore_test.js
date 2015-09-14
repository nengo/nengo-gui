// run this file with `mocha datastore_test.js`
// Will figure out how to integrate with TravisCI later

global.Nengo = {};

require("../datastore")
var assert = require("assert");

var sim = {
            time_slider:{
                first_shown_time:0,
                shown_time:0,
                last_time:0,
                kept_time:2
            }
}

describe("DataStore", function() {
    var data_store = new Nengo.DataStore(2, sim, 0);

    beforeEach(function() {
        data_store = new Nengo.DataStore(2, sim, 0);
    });

    it("accepts data", function() {
        data_store.push([0.0, 1.1, 1.2]);
        // remeber that 0.0 is the time-stamp
        assert.deepEqual(data_store.data, [[1.1], [1.2]]);
    });

    it("orders data", function() {
        data_store.push([1.0, 3.1, 3.2]);
        data_store.push([0.5, 2.1, 2.2]);
        // newer data received out of order should be discarded
        assert.deepEqual(data_store.data, [[2.1], [2.2]]);
    });

    it("filters data", function() {
        data_store.synapse = 0.1;
        data_store.push([0.1, 2.1, 2.2]);
        data_store.push([0.2, 3.1, 3.2]);
        data_store.push([0.3, 1.1, 1.2]);
        for(var i = 0; i < data_store.data.length; i++){
            for(var j = 0; j < data_store.data[i].length; j++){
                data_store.data[i][j] = Math.ceil(data_store.data[i][j]);
            }
        }
        assert.deepEqual(data_store.data, [[3, 3, 2], [3, 3, 2]]);
    });

    it("resets data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.push([1.5, 4.1, 4.2]);
        data_store.reset();
        assert.deepEqual(data_store.data, [[], []]);
    });

    it("throws away old data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.push([1.5, 4.1, 4.2]);
        data_store.sim.time_slider.last_time = 3;
        // given that the most recent time received is 3s and the data_store
        // keep 2s of data, the oldest entry should be discarded
        data_store.update();
        assert.deepEqual(data_store.data, [[3.1, 4.1], [3.2, 4.2]]);
    });

    it("gives the shown data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.push([1.5, 4.1, 4.2]);
        data_store.push([2.5, 5.1, 5.2]);
        data_store.sim.time_slider.first_shown_time = 1.0;
        data_store.sim.time_slider.shown_time = 1.0;
        assert.deepEqual(data_store.get_shown_data(), [[3.1, 4.1], [3.2, 4.2]]);
    });

    it("gives the last data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.push([1.5, 4.1, 4.2]);
        data_store.push([2.5, 5.1, 5.2]);
        data_store.sim.time_slider.first_shown_time = 1.0;
        data_store.sim.time_slider.shown_time = 1.0;
        assert.deepEqual(data_store.get_last_data(), [5.1, 5.2]);
    });

});

describe("GrowableDataStore", function() {
    var data_store = new Nengo.GrowableDataStore(2, sim, 0);

    beforeEach(function() {
        data_store = new Nengo.GrowableDataStore(2, sim, 0);
    });

    it("accepts data", function() {
        data_store.push([0.0, 1.1, 1.2])
        assert.deepEqual(data_store.data, [[1.1], [1.2]])
    });

    it("accepts jagged data", function() {
        data_store.push([0.0, 1.1, 1.2])
        data_store.dims = 3;
        assert.equal(data_store.dims, 3)
        data_store.push([0.1, 2.1, 2.2, 2.3]);
        assert.equal(data_store.dims, 3)
        assert.deepEqual(data_store.data, [[1.1, 2.1], [1.2, 2.2], [2.3]]);
    });

    it("orders data", function() {
        data_store.push([0.0, 1.1, 1.2])
        data_store.dims = 3;
        data_store.push([0.5, 2.1, 2.2, 2.3]);
        data_store.push([0.1, 3.1, 3.2, 3.3]);
        assert.deepEqual(data_store.data, [[1.1, 3.1], [1.2, 3.2], [3.3]]);
    });

    it("filters data", function() {
        data_store.synapse = 0.1;
        data_store.push([0.1, 2.1, 2.2]);
        data_store.push([0.2, 3.1, 3.2]);
        data_store.dims = 3;
        data_store.push([0.3, 1.1, 1.2, 1.3]);
        for(var i = 0; i < data_store.data.length; i++){
            for(var j = 0; j < data_store.data[i].length; j++){
                data_store.data[i][j] = Math.ceil(data_store.data[i][j]);
            }
        }
        assert.deepEqual(data_store.data, [[3, 3, 2], [3, 3, 2], [2]]);
    });

    it("resets data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.dims = 3;
        data_store.push([1.5, 4.1, 4.2, 4.3]);
        data_store.reset();
        assert.deepEqual(data_store.data, [[], [], []]);
    });

    it("throws away old data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.dims = 3;
        data_store.push([1.5, 4.1, 4.2, 4.3]);
        data_store.sim.time_slider.kept_time = 2;
        data_store.sim.time_slider.last_time = 3;
        data_store.update();
        assert.equal(data_store.dims, 3)
        assert.deepEqual(data_store.data, [[3.1, 4.1], [3.2, 4.2], [4.3]]);
        data_store.dims = 4;
        data_store.push([1.5, 5.1, 5.2, 5.3, 5.4]);
        data_store.update();
        assert.deepEqual(
            data_store.data,
            [[3.1, 4.1, 5.1], [3.2, 4.2, 5.2], [4.3, 5.3], [5.4]]);
    });

    it("gives the shown data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.dims = 3;
        data_store.push([1.5, 4.1, 4.2, 4.3]);
        data_store.dims = 4;
        data_store.push([2.5, 5.1, 5.2, 5.3, 5.4]);
        data_store.sim.time_slider.first_shown_time = 1.0;
        data_store.sim.time_slider.shown_time = 1.0;
        assert.deepEqual(data_store.get_shown_data(), [[3.1, 4.1], [3.2, 4.2], ["NaN", 4.3], []]);
    });

    it("gives the shown data with more dimensions", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.dims = 3;
        data_store.push([1.5, 4.1, 4.2, 4.3]);
        data_store.dims = 4;
        data_store.push([1.75, 5.1, 5.2, 5.3, 5.4]);
        data_store.push([2.5, 6.1, 6.2, 6.3, 6.4]);
        data_store.sim.time_slider.first_shown_time = 1.0;
        data_store.sim.time_slider.shown_time = 1.0;
        assert.deepEqual(data_store.get_shown_data(), [[3.1, 4.1, 5.1], [3.2, 4.2, 5.2], ["NaN", 4.3, 5.3], ["NaN", "NaN", 5.4]]);
    });

    it("gives the last data", function() {
        data_store.push([0.5, 2.1, 2.2]);
        data_store.push([1.0, 3.1, 3.2]);
        data_store.dims = 3;
        data_store.push([1.5, 4.1, 4.2, 4.3]);
        data_store.push([2.5, 5.1, 5.2, 5.3]);
        data_store.sim.time_slider.first_shown_time = 1.0;
        data_store.sim.time_slider.shown_time = 1.0;
        assert.equal(data_store.dims, 3)
        assert.deepEqual(data_store.get_last_data(), [5.1, 5.2, 5.3]);
    });

});
