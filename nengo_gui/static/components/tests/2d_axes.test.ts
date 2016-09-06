/**
 * Test the Axes2D class.
 */

import * as test from "tape";

import { document } from "../../tests/utils";

import Axes2D from "../2d_axes";

test("Axes2D", t => {
    const div = document.createElement("div");

    const axes = new Axes2D(div, {
        "height": 100,
        "max_value": 1,
        "min_value": 0,
        "width": 100,
    });

    // t.equal(div.outerHTML, "<div></div>");
    t.end();
});
