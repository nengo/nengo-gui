/**
 * Test the Axes2D class.
 */

// import { dom, h } from "maquette";
import * as test from "tape";

import * as fixtures from "./fixtures";

import { SimControl } from "../sim-control";

test("SimControl status", assert => {
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
