/**
 * Test the DataStore and GrowableDataStore.
 */

import * as test from "tape";

import * as fixtures from "./fixtures";

import { DataStore, GrowableDataStore } from "../datastore";

const timeSlider = {
    currentTime: 0,
    firstShownTime: 0,
    keptTime: 2,
    shownTime: 0,
};

test("DataStore accepts data", assert => {
    const dataStore = new DataStore(2, timeSlider, 0);

    dataStore.push([0.0, 1.1, 1.2]);
    // remember that 0.0 is the time-stamp
    assert.deepEqual(dataStore.data, [[1.1], [1.2]]);
    fixtures.teardown(assert);
});

test("DataStore orders data", assert => {
    const dataStore = new DataStore(2, timeSlider, 0);

    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([0.5, 2.1, 2.2]);

    // newer data received out of order should be discarded
    assert.deepEqual(dataStore.data, [[2.1], [2.2]]);
    fixtures.teardown(assert);
});

test("DataStore filters data", assert => {
    const dataStore = new DataStore(2, timeSlider, 0);

    dataStore.synapse = 0.1;
    dataStore.push([0.1, 2.1, 2.2]);
    dataStore.push([0.2, 3.1, 3.2]);
    dataStore.push([0.3, 1.1, 1.2]);
    for (let i = 0; i < dataStore.data.length; i++) {
        for (let j = 0; j < dataStore.data[i].length; j++) {
            dataStore.data[i][j] = Math.ceil(dataStore.data[i][j]);
        }
    }

    assert.deepEqual(dataStore.data, [[3, 3, 2], [3, 3, 2]]);
    fixtures.teardown(assert);
});

test("DataStore resets data", assert => {
    const dataStore = new DataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2]);
    dataStore.reset();

    assert.deepEqual(dataStore.data, [[], []]);
    fixtures.teardown(assert);
});

test("DataStore throws away old data", assert => {
    const dataStore = new DataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2]);
    dataStore.timeSlider.currentTime = 3;
    // given that the most recent time received is 3s and the dataStore
    // keep 2s of data, the oldest entry should be discarded
    dataStore.update();

    assert.deepEqual(dataStore.data, [[3.1, 4.1], [3.2, 4.2]]);
    fixtures.teardown(assert);
});

test("DataStore gives the shown data", assert => {
    const dataStore = new DataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2]);
    dataStore.push([2.5, 5.1, 5.2]);
    dataStore.timeSlider.firstShownTime = 1.0;
    dataStore.timeSlider.shownTime = 1.0;

    assert.deepEqual(dataStore.getShownData(), [[3.1, 4.1], [3.2, 4.2]]);
    fixtures.teardown(assert);
});

test("DataStore gives the last data", assert => {
    const dataStore = new DataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2]);
    dataStore.push([2.5, 5.1, 5.2]);
    dataStore.timeSlider.firstShownTime = 1.0;
    dataStore.timeSlider.shownTime = 1.0;

    assert.deepEqual(dataStore.getLastData(), [5.1, 5.2]);
    fixtures.teardown(assert);
});

test("GrowableDataStore accepts data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.0, 1.1, 1.2]);

    assert.deepEqual(dataStore.data, [[1.1], [1.2]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore accepts jagged data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.0, 1.1, 1.2]);
    dataStore.dims = 3;
    assert.is(dataStore.dims, 3);

    dataStore.push([0.1, 2.1, 2.2, 2.3]);
    assert.is(dataStore.dims, 3);
    assert.deepEqual(dataStore.data, [[1.1, 2.1], [1.2, 2.2], [2.3]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore orders data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.0, 1.1, 1.2]);
    dataStore.dims = 3;
    dataStore.push([0.5, 2.1, 2.2, 2.3]);
    dataStore.push([0.1, 3.1, 3.2, 3.3]);

    assert.deepEqual(dataStore.data, [[1.1, 3.1], [1.2, 3.2], [3.3]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore filters data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.synapse = 0.1;
    dataStore.push([0.1, 2.1, 2.2]);
    dataStore.push([0.2, 3.1, 3.2]);
    dataStore.dims = 3;
    dataStore.push([0.3, 1.1, 1.2, 1.3]);
    for (let i = 0; i < dataStore.data.length; i++) {
        for (let j = 0; j < dataStore.data[i].length; j++) {
            dataStore.data[i][j] = Math.ceil(dataStore.data[i][j]);
        }
    }

    assert.deepEqual(dataStore.data, [[3, 3, 2], [3, 3, 2], [2]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore resets data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.dims = 3;
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.reset();

    assert.deepEqual(dataStore.data, [[], [], []]);
    fixtures.teardown(assert);
});

test("GrowableDataStore throws away old data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.dims = 3;
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.timeSlider.keptTime = 2;
    dataStore.timeSlider.currentTime = 3;
    dataStore.update();
    assert.is(dataStore.dims, 3);
    assert.deepEqual(dataStore.data, [[3.1, 4.1], [3.2, 4.2], [4.3]]);

    dataStore.dims = 4;
    dataStore.push([1.5, 5.1, 5.2, 5.3, 5.4]);
    dataStore.update();
    assert.deepEqual(
        dataStore.data,
        [[3.1, 4.1, 5.1], [3.2, 4.2, 5.2], [4.3, 5.3], [5.4]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore gives the shown data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.dims = 3;
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.dims = 4;
    dataStore.push([2.5, 5.1, 5.2, 5.3, 5.4]);
    dataStore.timeSlider.firstShownTime = 1.0;
    dataStore.timeSlider.shownTime = 1.0;

    assert.deepEqual(dataStore.getShownData(),
                [[3.1, 4.1], [3.2, 4.2], ["NaN", 4.3], []]);
    fixtures.teardown(assert);
});

test("GrowableDataStore gives the shown data with more dimensions", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.dims = 3;
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.dims = 4;
    dataStore.push([1.75, 5.1, 5.2, 5.3, 5.4]);
    dataStore.push([2.5, 6.1, 6.2, 6.3, 6.4]);
    dataStore.timeSlider.firstShownTime = 1.0;
    dataStore.timeSlider.shownTime = 1.0;

    assert.deepEqual(dataStore.getShownData(),
                     [[3.1, 4.1, 5.1],
                      [3.2, 4.2, 5.2],
                      ["NaN", 4.3, 5.3],
                      ["NaN", "NaN", 5.4]]);
    fixtures.teardown(assert);
});

test("GrowableDataStore gives the last data", assert => {
    const dataStore = new GrowableDataStore(2, timeSlider, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.dims = 3;
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.push([2.5, 5.1, 5.2, 5.3]);
    dataStore.timeSlider.firstShownTime = 1.0;
    dataStore.timeSlider.shownTime = 1.0;

    assert.is(dataStore.dims, 3);
    assert.deepEqual(dataStore.getLastData(), [5.1, 5.2, 5.3]);
    fixtures.teardown(assert);
});
