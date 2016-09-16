/**
 * Test the DataStore and GrowableDataStore.
 */

import * as test from "tape";

import * as fixtures from "./fixtures";

import { DataStore, GrowableDataStore } from "../datastore";

const sim = {
    time_slider: {
        first_shown_time: 0,
        kept_time: 2,
        last_time: 0,
        shown_time: 0,
    },
};

test("DataStore accepts data", assert => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);
    // remember that 0.0 is the time-stamp
    assert.deepEqual(data_store.data, [[1.1], [1.2]]);
    fixtures.teardown(assert);
});

test("DataStore orders data", assert => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([0.5, 2.1, 2.2]);

    // newer data received out of order should be discarded
    assert.deepEqual(data_store.data, [[2.1], [2.2]]);
    fixtures.teardown(assert);
});

test("DataStore filters data", assert => {
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

    assert.deepEqual(data_store.data, [[3, 3, 2], [3, 3, 2]]);
    fixtures.teardown(assert);
});

test("DataStore resets data", assert => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.reset();

    assert.deepEqual(data_store.data, [[], []]);
    fixtures.teardown(assert);
});

test("DataStore throws away old data", assert => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.sim.time_slider.last_time = 3;
    // given that the most recent time received is 3s and the data_store
    // keep 2s of data, the oldest entry should be discarded
    data_store.update();

    assert.deepEqual(data_store.data, [[3.1, 4.1], [3.2, 4.2]]);
    fixtures.teardown(assert);
});

test("DataStore gives the shown data", assert => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.push([2.5, 5.1, 5.2]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    assert.deepEqual(data_store.get_shown_data(), [[3.1, 4.1], [3.2, 4.2]]);
    fixtures.teardown(assert);
});

test("DataStore gives the last data", assert => {
    const data_store = new DataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.push([1.5, 4.1, 4.2]);
    data_store.push([2.5, 5.1, 5.2]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    assert.deepEqual(data_store.get_last_data(), [5.1, 5.2]);
    fixtures.teardown(assert);
});

test("GrowableDataStore accepts data", assert => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);

    assert.deepEqual(data_store.data, [[1.1], [1.2]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore accepts jagged data", assert => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);
    data_store.dims = 3;
    assert.is(data_store.dims, 3);

    data_store.push([0.1, 2.1, 2.2, 2.3]);
    assert.is(data_store.dims, 3);
    assert.deepEqual(data_store.data, [[1.1, 2.1], [1.2, 2.2], [2.3]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore orders data", assert => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.0, 1.1, 1.2]);
    data_store.dims = 3;
    data_store.push([0.5, 2.1, 2.2, 2.3]);
    data_store.push([0.1, 3.1, 3.2, 3.3]);

    assert.deepEqual(data_store.data, [[1.1, 3.1], [1.2, 3.2], [3.3]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore filters data", assert => {
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

    assert.deepEqual(data_store.data, [[3, 3, 2], [3, 3, 2], [2]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore resets data", assert => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.reset();

    assert.deepEqual(data_store.data, [[], [], []]);
    fixtures.teardown(assert);
});

test("GrowableDataStore throws away old data", assert => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.sim.time_slider.kept_time = 2;
    data_store.sim.time_slider.last_time = 3;
    data_store.update();
    assert.is(data_store.dims, 3);
    assert.deepEqual(data_store.data, [[3.1, 4.1], [3.2, 4.2], [4.3]]);

    data_store.dims = 4;
    data_store.push([1.5, 5.1, 5.2, 5.3, 5.4]);
    data_store.update();
    assert.deepEqual(
        data_store.data,
        [[3.1, 4.1, 5.1], [3.2, 4.2, 5.2], [4.3, 5.3], [5.4]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore gives the shown data", assert => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.dims = 4;
    data_store.push([2.5, 5.1, 5.2, 5.3, 5.4]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    assert.deepEqual(data_store.get_shown_data(),
                [[3.1, 4.1], [3.2, 4.2], ["NaN", 4.3], []]);
    fixtures.teardown(assert);
});

test("GrowableDataStore gives the shown data with more dimensions", assert => {
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

    assert.deepEqual(data_store.get_shown_data(),
                     [[3.1, 4.1, 5.1],
                      [3.2, 4.2, 5.2],
                      ["NaN", 4.3, 5.3],
                      ["NaN", "NaN", 5.4]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore gives the last data", assert => {
    const data_store = new GrowableDataStore(2, sim, 0);

    data_store.push([0.5, 2.1, 2.2]);
    data_store.push([1.0, 3.1, 3.2]);
    data_store.dims = 3;
    data_store.push([1.5, 4.1, 4.2, 4.3]);
    data_store.push([2.5, 5.1, 5.2, 5.3]);
    data_store.sim.time_slider.first_shown_time = 1.0;
    data_store.sim.time_slider.shown_time = 1.0;

    assert.is(data_store.dims, 3);
    assert.deepEqual(data_store.get_last_data(), [5.1, 5.2, 5.3]);
    fixtures.teardown(assert);
});
