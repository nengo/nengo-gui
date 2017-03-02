/**
 * Test the DataStore and FlexibleDataStore.
 */

import * as test from "tape";

import * as fixtures from "./fixtures";

import { DataStore, FlexibleDataStore } from "../datastore";
import { TimeSlider } from "../sim-control";

test("DataStore.indexGreaterThan", assert => {
    const array = [-1, 0, 1];
    assert.is(DataStore.indexBefore(array, -2), 0);
    assert.is(DataStore.indexBefore(array, -1), 0);
    assert.is(DataStore.indexBefore(array, -0.5), 0);
    assert.is(DataStore.indexBefore(array, 0), 1);
    assert.is(DataStore.indexBefore(array, 0.5), 1);
    assert.is(DataStore.indexBefore(array, 1), 2);
    assert.is(DataStore.indexBefore(array, 1.5), 2);
    fixtures.teardown(assert);
});

const timeSlider = {
    currentTime: 0,
    firstShownTime: 0,
    keptTime: 2,
    shownTime: 0,
} as TimeSlider;

test("DataStore accepts data", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.push([0.0, 1.1, 1.2]);
    // remember that 0.0 is the time-stamp
    assert.deepEqual(dataStore.data, [[1.1], [1.2]]);
    fixtures.teardown(assert);
});

test("DataStore orders data", assert => {
    const dataStore = new DataStore(2, 0);

    dataStore.push([0.0, 1.1, 1.2]);
    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([0.1, 3.1, 3.2]);

    // newer data received out of order should be discarded
    assert.deepEqual(dataStore.data, [[3.1], [3.2]]);
    fixtures.teardown(assert);
});

test("DataStore filters data", assert => {
    const dataStore = new DataStore(2, 0);

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
    const dataStore = new DataStore(2, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2]);
    dataStore.reset();

    assert.deepEqual(dataStore.data, [[], []]);
    fixtures.teardown(assert);
});

test("DataStore throws away old data", assert => {
    const dataStore = new DataStore(2, 0);
    const ts = Object.create(timeSlider);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2]);
    ts.currentTime = 3;
    // given that the most recent time received is 3s and the dataStore
    // keep 2s of data, the oldest entry should be discarded
    dataStore.update(ts);

    assert.deepEqual(dataStore.data, [[3.1, 4.1], [3.2, 4.2]]);
    fixtures.teardown(assert);
});

test("DataStore gives the shown data", assert => {
    const dataStore = new DataStore(2, 0);
    const ts = Object.create(timeSlider);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([2.0, 4.1, 4.2]);
    dataStore.push([2.5, 5.1, 5.2]);
    ts.firstShownTime = 1.0;
    ts.shownTime = 1.0;

    assert.deepEqual(dataStore.getShownData(ts), [[3.1, 4.1], [3.2, 4.2]]);
    fixtures.teardown(assert);
});

test("DataStore gives the last data", assert => {
    const dataStore = new DataStore(2, 0);
    const ts = Object.create(timeSlider);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2]);
    dataStore.push([2.5, 5.1, 5.2]);
    ts.firstShownTime = 1.0;
    ts.shownTime = 1.0;

    // TODO: why was this [5.1, 5.2] before?
    assert.deepEqual(dataStore.getLastData(ts), [4.1, 4.2]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore accepts data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.push([0.0, 1.1, 1.2]);

    assert.deepEqual(dataStore.data, [[1.1], [1.2]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore accepts jagged data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.push([0.0, 1.1, 1.2]);
    assert.is(dataStore.dims, 2);
    dataStore.push([0.1, 2.1, 2.2, 2.3]);
    assert.is(dataStore.dims, 3);
    assert.deepEqual(dataStore.data, [[1.1, 2.1], [1.2, 2.2], [null, 2.3]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore orders data", assert => {
    const dataStore = new FlexibleDataStore(3, 0);

    dataStore.push([0.0, 1.1, 1.2, 1.3]);
    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([0.1, 3.1, 3.2]);

    assert.deepEqual(dataStore.data, [[3.1], [3.2]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore filters data", assert => {
    const dataStore = new FlexibleDataStore(2, 0.1);

    dataStore.push([0.1, 2.1, 2.2]);
    dataStore.push([0.2, 3.1, 3.2]);
    dataStore.push([0.3, 1.1, 1.2, 1.3]);
    for (let i = 0; i < dataStore.data.length; i++) {
        for (let j = 0; j < dataStore.data[i].length; j++) {
            if (dataStore.data[i][j] !== null) {
                dataStore.data[i][j] = Math.ceil(dataStore.data[i][j]);
            }
        }
    }

    assert.deepEqual(dataStore.data, [[3, 3, 2], [3, 3, 2], [null, null, 2]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore resets data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.reset();

    assert.deepEqual(dataStore.data, [[], [], []]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore throws away old data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);
    const ts = Object.create(timeSlider);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    ts.keptTime = 2;
    ts.currentTime = 3;
    dataStore.update(ts);
    assert.is(dataStore.dims, 3);
    assert.deepEqual(dataStore.data, [[3.1, 4.1], [3.2, 4.2], [null, 4.3]]);

    dataStore.push([1.5, 5.1, 5.2, 5.3, 5.4]);
    dataStore.update(ts);
    assert.deepEqual(
        dataStore.data,
        [[3.1, 4.1, 5.1], [3.2, 4.2, 5.2], [null, 4.3, 5.3], [null, null, 5.4]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore gives the shown data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);
    const ts = Object.create(timeSlider);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.push([2.5, 5.1, 5.2, 5.3, 5.4]);
    ts.firstShownTime = 1.0;
    ts.shownTime = 1.0;

    assert.deepEqual(dataStore.getShownData(ts),
                     [[3.1, 4.1], [3.2, 4.2], [null, 4.3], [null, null]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore gives the shown data with more dimensions", assert => {
    const dataStore = new FlexibleDataStore(2, 0);
    const ts = Object.create(timeSlider);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.push([1.75, 5.1, 5.2, 5.3, 5.4]);
    dataStore.push([2.5, 6.1, 6.2, 6.3, 6.4]);
    ts.firstShownTime = 1.0;
    ts.shownTime = 1.0;

    assert.deepEqual(dataStore.getShownData(ts),
                     [[3.1, 4.1, 5.1],
                      [3.2, 4.2, 5.2],
                      [null, 4.3, 5.3],
                      [null, null, 5.4]]);
    fixtures.teardown(assert);
});

test("FlexibleDataStore gives the last data", assert => {
    const dataStore = new FlexibleDataStore(2, 0);
    const ts = Object.create(timeSlider);

    dataStore.push([0.5, 2.1, 2.2]);
    dataStore.push([1.0, 3.1, 3.2]);
    dataStore.push([1.5, 4.1, 4.2, 4.3]);
    dataStore.push([2.5, 5.1, 5.2, 5.3]);
    ts.firstShownTime = 1.0;
    ts.shownTime = 1.0;

    assert.is(dataStore.dims, 3);
    // TODO: why was this [5.1, 5.2, 5.3] before?
    assert.deepEqual(dataStore.getLastData(ts), [4.1, 4.2, 4.3]);
    fixtures.teardown(assert);
});
