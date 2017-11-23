/**
 * Test the DataStore and FlexibleDataStore.
 */

import * as test from "tape";

import * as fixtures from "./fixtures";

import { DataStore } from "../datastore";

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
    const datastore = new DataStore(2, 0);

    datastore.add([0.0, 1.1, 1.2]);
    // remember that 0.0 is the time-stamp
    assert.deepEqual(datastore.data, [[0.0, 1.1, 1.2]]);
    fixtures.teardown(assert);
});

test("DataStore orders data", assert => {
    const datastore = new DataStore(3, 0);

    datastore.add([0.0, 1.1, 1.2, 1.3]);
    datastore.dims = 2;
    datastore.add([0.5, 2.1, 2.2]);
    datastore.add([0.1, 3.1, 3.2]);

    assert.deepEqual(datastore.data, [[0.1, 3.1, 3.2]]);
    fixtures.teardown(assert);
});

test("DataStore can change dimension", assert => {
    const datastore = new DataStore(2, 0);

    datastore.add([0.0, 1.1, 1.2]);
    assert.is(datastore.dims, 2);
    datastore.dims = 3;
    datastore.add([0.1, 2.1, 2.2, 2.3]);
    assert.is(datastore.dims, 3);
    assert.deepEqual(datastore.data, [
        [0.0, 1.1, 1.2, null], [0.1, 2.1, 2.2, 2.3]
    ]);
    fixtures.teardown(assert);
});

test("DataStore filters data", assert => {
    const datastore = new DataStore(2, 0.1);

    datastore.add([0.1, 2.1, 2.2]);
    datastore.add([0.2, 3.1, 3.2]);
    datastore.dims = 3;
    datastore.add([0.3, 1.1, 1.2, 1.3]);
    // Ceiling all the data
    datastore.data.forEach((r, i) => {
        datastore.data[i] = [r[0]].concat(r.slice(1).map(d => Math.ceil(d)));
    });

    // NB: Math.ceil(null) gives 0, unfortunately
    assert.deepEqual(datastore.data, [
        [0.1, 3, 3, 0], [0.2, 3, 3, 0], [0.3, 2, 2, 2]
    ]);
    fixtures.teardown(assert);
});

test("DataStore resets data", assert => {
    const datastore = new DataStore(2, 0);

    datastore.add([0.5, 2.1, 2.2]);
    datastore.add([1.0, 3.1, 3.2]);
    datastore.dims = 3;
    datastore.add([1.5, 4.1, 4.2, 4.3]);
    datastore.reset();

    assert.deepEqual(datastore.data, []);
    fixtures.teardown(assert);
});

test("DataStore throws away old data", assert => {
    const dom = new fixtures.DOM(assert);
    const datastore = new DataStore(2, 0);
    const detail = {detail: {currentTime: 3, keptTime: 2}};

    datastore.add([0.5, 2.1, 2.2]);
    datastore.add([1.0, 3.1, 3.2]);
    datastore.dims = 3;
    datastore.add([1.5, 4.1, 4.2, 4.3]);
    dom.window.dispatchEvent(new CustomEvent("TimeSlider.addTime", detail));

    assert.is(datastore.dims, 3);
    assert.deepEqual(datastore.data, [
        [1.0, 3.1, 3.2, null], [1.5, 4.1, 4.2, 4.3]
    ]);

    datastore.dims = 4;
    datastore.add([1.5, 5.1, 5.2, 5.3, 5.4]);
    dom.window.dispatchEvent(new CustomEvent("TimeSlider.addTime", detail));
    assert.deepEqual(datastore.data, [
        [1.0, 3.1, 3.2, null, null],
        [1.5, 4.1, 4.2, 4.3, null],
        [1.5, 5.1, 5.2, 5.3, 5.4],
    ]);
    fixtures.teardown(assert);
});

test("DataStore can be sliced", assert => {
    const datastore = new DataStore(2, 0);

    datastore.add([0.5, 2.1, 2.2]);
    datastore.add([1.0, 3.1, 3.2]);
    datastore.dims = 3;
    datastore.add([1.5, 4.1, 4.2, 4.3]);
    datastore.dims = 4;
    datastore.add([1.75, 5.1, 5.2, 5.3, 5.4]);
    datastore.add([2.5, 6.1, 6.2, 6.3, 6.4]);

    assert.deepEqual(datastore.timeSlice(1.0, 2.0), [
        [1.0, 3.1, 3.2, null, null],
        [1.5, 4.1, 4.2, 4.3, null],
        [1.75, 5.1, 5.2, 5.3, 5.4]
    ]);
    fixtures.teardown(assert);
});
