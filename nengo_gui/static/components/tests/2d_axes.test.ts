/**
 * Test the Axes2D class.
 */

import * as test from "tape";
import { dom, h } from "maquette";

import * as fixtures from "../../tests/fixtures";

import Axes2D from "../2d_axes";

function axes_node() {
    return h("div", [h("svg", {height: "100%", width: "100%"}, [
        x_axis(),
        y_axis(),
    ])]);
}

function x_axis() {
    return h("g.axis.axis_x.unselectable", [
        x_tick(0.0),
        x_tick(0.5),
        x_tick(1.0),
        h("path.domain", {d: "M0,6V0H1V6" }),
    ]);
}

function x_tick(x) {
    return h("g.tick", {
        styles: {opacity: "1"},
        transform: "translate(" + x + ",0)",
    }, [
        h("line", {x2: "0", y2: "6"}),
        h("text", {
            dy: ".71em",
            style: "text-anchor: middle;",
            x: "0",
            y: "9",
        }, [x.toFixed(1)]),
    ]);
}

function y_axis() {
    return h("g.axis.axis_y.unselectable", [
        y_tick(0.0),
        y_tick(1.0),
        h("path.domain", {d: "M-6,0H0V1H-6"}),
    ]);
}

function y_tick(y) {
    return h("g.tick", {
        style: "opacity: 1;",
        transform: "translate(0," + y + ")",
    }, [
        h("line", {x2: "-6", y2: "0"}),
        h("text", {
            dy: ".32em",
            style: "text-anchor: end;",
            x: "-9",
            y: "0",
        }, [y.toFixed(1)]),
    ]);
}

test("Axes2D.set_axes_geometry", assert => {
    const document = new fixtures.Document(assert);
    const div = document.document.createElement("div");

    const axes = new Axes2D(div, {
        "height": 100,
        "max_value": 1,
        "min_value": 0,
        "width": 100,
    });

    // assert.equal(div.innerHTML, dom.create(axes_node()).domNode.innerHTML);
    assert.ok(div.isEqualNode(dom.create(axes_node()).domNode));
    assert.equal(axes.width, 100);
    assert.equal(axes.height, 100);
    assert.equal(axes.ax_left, 100);
    assert.equal(axes.ax_right, 0);
    assert.equal(axes.ax_bottom, 0);
    assert.equal(axes.ax_top, 0);
    assert.equal(axes.tick_size, 0);
    assert.equal(axes.tick_padding, 0);

    axes.set_axes_geometry(50, 50);

    assert.equal(div.innerHTML, "");

    fixtures.teardown(assert, document);
});
