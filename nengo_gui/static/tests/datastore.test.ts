/**
 * Test the DataStore and GrowableDataStore.
 */

import * as test from "tape";

import { DataStore, GrowableDataStore } from "../datastore";

const sim = {
    time_slider: {
        first_shown_time: 0,
        kept_time: 2,
        last_time: 0,
        shown_time: 0,
    },
};

test("DataStore accepts data", t => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);
    // remember that 0.0 is the time-stamp
    t.deepEqual(data_store.data, [[1.1], [1.2]]);
    t.end();
});

test("DataStore orders data", t => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([0.5, 2.1, 2.2]);

    // newer data received out of order should be discarded
    t.deepEqual(data_store.data, [[2.1], [2.2]]);
    t.end();
});

test("DataStore filters data", t => {
    const data_store = new DataStore(2, sim, 0);

    data_store.synapse = 0.1;
    data_store.push([0.1, 2.1, 2.2]);
    data_store.push([0.2, 3.1, 3.2]);
    data_store.push([0.3, 1.1, 1.2]);
    for (let i = 0; i < data_store.data.length; i++) {
        for (let j = 0; j < data_store.data[i].length; j++) {
            data_store.data[i][j] = Math.ceil(data_store.data[i][j]);
        }
    }

    t.deepEqual(data_store.data, [[3, 3, 2], [3, 3, 2]]);
    t.end();
});

test("DataStore resets data", t => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.reset();

    t.deepEqual(data_store.data, [[], []]);
    t.end();
});

test("DataStore throws away old data", t => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.sim.time_slider.last_time = 3;
    // given that the most recent time received is 3s and the data_store
    // keep 2s of data, the oldest entry should be discarded
    data_store.update();

    t.deepEqual(data_store.data, [[3.1, 4.1], [3.2, 4.2]]);
    t.end();
});

test("DataStore gives the shown data", t => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.push([2.5, 5.1, 5.2]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    t.deepEqual(data_store.get_shown_data(), [[3.1, 4.1], [3.2, 4.2]]);
    t.end();
});

test("DataStore gives the last data", t => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.push([2.5, 5.1, 5.2]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    t.deepEqual(data_store.get_last_data(), [5.1, 5.2]);
    t.end();
});

test("GrowableDataStore accepts data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);

    t.deepEqual(data_store.data, [[1.1], [1.2]]);
    t.end();
});

test("GrowableDataStore accepts jagged data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);
    data_store.dims = 3;
    t.is(data_store.dims, 3);

    data_store.push([0.1, 2.1, 2.2, 2.3]);
    t.is(data_store.dims, 3);
    t.deepEqual(data_store.data, [[1.1, 2.1], [1.2, 2.2], [2.3]]);
    t.end();
});

test("GrowableDataStore orders data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);
    data_store.dims = 3;
    data_store.push([0.5, 2.1, 2.2, 2.3]);
    data_store.push([0.1, 3.1, 3.2, 3.3]);

    t.deepEqual(data_store.data, [[1.1, 3.1], [1.2, 3.2], [3.3]]);
    t.end();
});

test("GrowableDataStore filters data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.synapse = 0.1;
    data_store.push([0.1, 2.1, 2.2]);
    data_store.push([0.2, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([0.3, 1.1, 1.2, 1.3]);
    for (let i = 0; i < data_store.data.length; i++) {
        for (let j = 0; j < data_store.data[i].length; j++) {
            data_store.data[i][j] = Math.ceil(data_store.data[i][j]);
        }
    }

    t.deepEqual(data_store.data, [[3, 3, 2], [3, 3, 2], [2]]);
    t.end();
});

test("GrowableDataStore resets data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.reset();

    t.deepEqual(data_store.data, [[], [], []]);
    t.end();
});

test("GrowableDataStore throws away old data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.sim.time_slider.kept_time = 2;
    data_store.sim.time_slider.last_time = 3;
    data_store.update();
    t.is(data_store.dims, 3);
    t.deepEqual(data_store.data, [[3.1, 4.1], [3.2, 4.2], [4.3]]);

    data_store.dims = 4;
    data_store.push([1.5, 5.1, 5.2, 5.3, 5.4]);
    data_store.update();
    t.deepEqual(
        data_store.data,
        [[3.1, 4.1, 5.1], [3.2, 4.2, 5.2], [4.3, 5.3], [5.4]]);
    t.end();
});

test("GrowableDataStore gives the shown data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.dims = 4;
    data_store.push([2.5, 5.1, 5.2, 5.3, 5.4]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    t.deepEqual(data_store.get_shown_data(),
                [[3.1, 4.1], [3.2, 4.2], ["NaN", 4.3], []]);
    t.end();
});

test("GrowableDataStore gives the shown data with more dimensions", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.dims = 4;
    data_store.push([1.75, 5.1, 5.2, 5.3, 5.4]);
    data_store.push([2.5, 6.1, 6.2, 6.3, 6.4]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    t.deepEqual(data_store.get_shown_data(),
                [[3.1, 4.1, 5.1],
                 [3.2, 4.2, 5.2],
                 ["NaN", 4.3, 5.3],
                 ["NaN", "NaN", 5.4]]);
    t.end();
});

test("GrowableDataStore gives the last data", t => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.push([2.5, 5.1, 5.2, 5.3]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    t.is(data_store.dims, 3);
    t.deepEqual(data_store.get_last_data(), [5.1, 5.2, 5.3]);
    t.end();
});
