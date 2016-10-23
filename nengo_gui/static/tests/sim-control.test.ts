/**
 * Test the Axes2D class.
 */

// import { dom, h } from "maquette";
import * as test from "tape";

import * as fixtures from "./fixtures";

import { SimControl } from "../sim-control";
import { MockConnection } from "../websocket";

test("SimControl.status", assert => {
    const dom = new fixtures.DOM(assert);
    const sim = new SimControl("uid", 4.0, 0.5);

    assert.equal(sim.status, "paused");
    assert.equal(sim.paused, true);
    assert.equal(sim.view.pauseIcon, "play");
    assert.equal(sim.view.spinPause, false);

    sim.status = "building";
    assert.equal(sim.status, "building");
    assert.equal(sim.paused, false);
    assert.equal(sim.view.pauseIcon, "cog");
    assert.equal(sim.view.spinPause, true);

    fixtures.teardown(assert, dom);
});

test("SimControl.attach", assert => {
    const dom = new fixtures.DOM(assert);
    const sim = new SimControl("uid", 4.0, 0.5);

    const conn = new MockConnection();
    sim.attach(conn);

    assert.ok(conn.isBound("close"));
    assert.ok(conn.isBound("simcontrol.status"));
    assert.ok(conn.isBound("simcontrol.simulator"));
    assert.ok(conn.isBound("simcontrol.config"));

    fixtures.teardown(assert, dom);
});

test("SimControl sends", assert => {
    const dom = new fixtures.DOM(assert);
    const sim = new SimControl("uid", 4.0, 0.5);

    const conn = new MockConnection();
    sim.attach(conn);

    sim.setBackend("test")
    assert.equal(conn.lastSentName, "simcontrol.set_backend");
    assert.deepEqual(conn.lastSent, {backend: "test"});

    sim.play()
    assert.equal(conn.lastSentName, "simcontrol.play");
    assert.deepEqual(conn.lastSent, {});

    sim.status = "running";
    sim.pause();
    assert.equal(conn.lastSentName, "simcontrol.pause");
    assert.deepEqual(conn.lastSent, {});

    sim.reset();
    assert.equal(sim.status, "paused");
    assert.ok(sim.paused);
    assert.equal(conn.lastSentName, "simcontrol.reset");
    assert.deepEqual(conn.lastSent, {});

    fixtures.teardown(assert, dom);
});

test("TimeSlider.addTime", assert => {
    const dom = new fixtures.DOM(assert);
    const ts = new SimControl("uid", 4.0, 0.5).timeSlider;
    const tolerance = 1e-5;

    let firstShown = ts.firstShownTime;

    // Increasing times
    [0.001, 0.01, 0.1, 1.0].forEach(time => {
        ts.addTime(time);
        assert.equal(ts.currentTime, time);
        assert.ok(ts.firstShownTime - (firstShown + time) <= tolerance);
    });

    // When time goes backward, we reset
    ts.addTime(0.5);
    assert.equal(ts.currentTime, 0);

    fixtures.teardown(assert, dom);
});

test("TimeSlider.reset", assert => {
    const dom = new fixtures.DOM(assert);
    const sim = new SimControl("uid", 4.0, 0.5);
    const ts = sim.timeSlider;

    ts.addTime(0.1);
    assert.equal(ts.currentTime, 0.1);
    ts.reset();
    assert.equal(ts.currentTime, 0);
    ts.addTime(0.1);
    assert.equal(ts.currentTime, 0.1);
    sim.view.reset.dispatchEvent(new Event("click"));
    assert.equal(ts.currentTime, 0);

    fixtures.teardown(assert, dom);
});
