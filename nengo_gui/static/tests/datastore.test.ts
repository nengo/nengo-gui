/**
 * Test the DataStore and FlexibleDataStore.
 */

import * as test from "tape";

import * as fixtures from "./fixtures";

import { DataStore, FlexibleDataStore } from "../datastore";

test("DataStore.nearestIndex", assert => {
    const array = [-1, 0, 1];
    assert.is(DataStore.nearestIndex(array, -2), 0);
    assert.is(DataStore.nearestIndex(array, -1), 0);
    assert.is(DataStore.nearestIndex(array, -0.5), 0);
    assert.is(DataStore.nearestIndex(array, 0), 1);
    assert.is(DataStore.nearestIndex(array, 0.5), 1);
    assert.is(DataStore.nearestIndex(array, 1), 2);
    assert.is(DataStore.nearestIndex(array, 1.5), 2);
    fixtures.teardown(assert);
});

test("DataStore accepts data", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.add([0.0, 1.1, 1.2]);
    // remember that 0.0 is the time-stamp
    assert.deepEqual(dataStore.data, [[0.0, 1.1, 1.2]]);
    fixtures.teardown(assert);
});

test("DataStore orders data", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.add([0.0, 1.1, 1.2]);
    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([0.1, 3.1, 3.2]);

    // newer data received out of order should be discarded
    assert.deepEqual(dataStore.data, [[0.1, 3.1, 3.2]]);
    fixtures.teardown(assert);
});

test("DataStore filters data", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.synapse = 0.1;
    dataStore.add([0.1, 2.1, 2.2]);
    dataStore.add([0.2, 3.1, 3.2]);
    dataStore.add([0.3, 1.1, 1.2]);
    // Ceiling all the data
    dataStore.data.forEach((r, i) => {
        dataStore.data[i] = [r[0]].concat(r.slice(1).map(d => Math.ceil(d)));
    });
    assert.deepEqual(dataStore.data, [
        [0.1, 3, 3], [0.2, 2, 3], [0.3, 1, 2]
    ]);
    fixtures.teardown(assert);
});

test("DataStore resets data", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2]);
    dataStore.reset();

    assert.deepEqual(dataStore.data, []);
    fixtures.teardown(assert);
});

test("DataStore throws away old data", assert => {
    const dom = new fixtures.DOM(assert);
    const dataStore = new DataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2]);
    // given that the most recent time received is 3s and the dataStore
    // keep 2s of data, the oldest entry should be discarded
    dom.window.dispatchEvent(new CustomEvent("TimeSlider.addTime", {
        detail: {currentTime: 3, keptTime: 2}
    }));

    assert.deepEqual(dataStore.data, [[1.0, 3.1, 3.2], [1.5, 4.1, 4.2]]);
    fixtures.teardown(assert);
});

test("DataStore can be sliced", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([2.0, 4.1, 4.2]);
    dataStore.add([2.5, 5.1, 5.2]);
    assert.deepEqual(dataStore.timeSlice(1.0, 2.0), [
        [1.0, 3.1, 3.2], [2.0, 4.1, 4.2]
    ]);
    fixtures.teardown(assert);
});

test("DataStore gives the last data", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2]);
    dataStore.add([2.5, 5.1, 5.2]);
    assert.deepEqual(dataStore.slice(dataStore.length - 1), [2.5, 5.1, 5.2]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore accepts data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.add([0.0, 1.1, 1.2]);

    assert.deepEqual(dataStore.data, [[0.0, 1.1, 1.2]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore accepts jagged data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.add([0.0, 1.1, 1.2]);
    assert.is(dataStore.dims, 2);
    dataStore.add([0.1, 2.1, 2.2, 2.3]);
    assert.is(dataStore.dims, 3);
    assert.deepEqual(dataStore.data, [
        [0.0, 1.1, 1.2, null], [0.1, 2.1, 2.2, 2.3]
    ]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore orders data", assert => {
    const dataStore = new FlexibleDataStore(3, 0);

    dataStore.add([0.0, 1.1, 1.2, 1.3]);
    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([0.1, 3.1, 3.2]);

    assert.deepEqual(dataStore.data, [[0.1, 3.1, 3.2]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore filters data", assert => {
    const dataStore = new FlexibleDataStore(2, 0.1);

    dataStore.add([0.1, 2.1, 2.2]);
    dataStore.add([0.2, 3.1, 3.2]);
    dataStore.add([0.3, 1.1, 1.2, 1.3]);
    // Ceiling all the data
    dataStore.data.forEach((r, i) => {
        dataStore.data[i] = [r[0]].concat(r.slice(1).map(d => Math.ceil(d)));
    });

    // NB: Math.ceil(null) gives 0, unfortunately
    assert.deepEqual(dataStore.data, [
        [0.1, 3, 3, 0], [0.2, 2, 3, 0], [0.3, 1, 2, 2]
    ]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore resets data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2, 4.3]);
    dataStore.reset();

    assert.deepEqual(dataStore.data, []);
    fixtures.teardown(assert);
});

test("FlexibleDataStore throws away old data", assert => {
    const dom = new fixtures.DOM(assert);
    const dataStore = new FlexibleDataStore(2, 0);
    const detail = {detail: {currentTime: 3, keptTime: 2}};

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2, 4.3]);
    dom.window.dispatchEvent(new CustomEvent("TimeSlider.addTime", detail));

    assert.is(dataStore.dims, 3);
    assert.deepEqual(dataStore.data, [
        [1.0, 3.1, 3.2, null], [1.5, 4.1, 4.2, 4.3]
    ]);

    dataStore.add([1.5, 5.1, 5.2, 5.3, 5.4]);
    dom.window.dispatchEvent(new CustomEvent("TimeSlider.addTime", detail));
    assert.deepEqual(dataStore.data, [
        [1.0, 3.1, 3.2, null, null],
        [1.5, 4.1, 4.2, 4.3, null],
        [1.5, 5.1, 5.2, 5.3, 5.4],
    ]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore can be sliced", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2, 4.3]);
    dataStore.add([2.5, 5.1, 5.2, 5.3, 5.4]);

    assert.deepEqual(dataStore.timeSlice(1.0, 2.0), [
        [1.0, 3.1, 3.2, null, null], [1.5, 4.1, 4.2, 4.3, null]
    ]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore can be sliced with more dimensions", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2, 4.3]);
    dataStore.add([1.75, 5.1, 5.2, 5.3, 5.4]);
    dataStore.add([2.5, 6.1, 6.2, 6.3, 6.4]);

    assert.deepEqual(dataStore.timeSlice(1.0, 2.0), [
        [1.0, 3.1, 3.2, null, null],
        [1.5, 4.1, 4.2, 4.3, null],
        [1.75, 5.1, 5.2, 5.3, 5.4]
    ]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore gives the last data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.add([0.5, 2.1, 2.2]);
    dataStore.add([1.0, 3.1, 3.2]);
    dataStore.add([1.5, 4.1, 4.2, 4.3]);
    dataStore.add([2.5, 5.1, 5.2, 5.3]);
    assert.is(dataStore.dims, 3);
    assert.deepEqual(
        dataStore.slice(dataStore.length - 1), [2.5, 5.1, 5.2, 5.3]
    );
    fixtures.teardown(assert);
});
