/**
 * Test the Axes2D class.
 */

import { dom, h } from "maquette";
import * as test from "tape";

import * as fixtures from "../../tests/fixtures";

import { Axes2D } from "../axes";

// function axesNode() {
//     return h("div", [h("svg", {height: "100%", width: "100%"}, [
//         xAxis(),
//         yAxis(),
//     ])]);
// }

// function xAxis() {
//     return h("g.axis.axisX.unselectable", [
//         xTick(0.0),
//         xTick(0.5),
//         xTick(1.0),
//         h("path.domain", {d: "M0,6V0H1V6" }),
//     ]);
// }

// function xTick(x) {
//     return h("g.tick", {
//         styles: {opacity: "1"},
//         transform: "translate(" + x + ",0)",
//     }, [
//         h("line", {x2: "0", y2: "6"}),
//         h("text", {
//             dy: ".71em",
//             style: "text-anchor: middle;",
//             x: "0",
//             y: "9",
//         }, [x.toFixed(1)]),
//     ]);
// }

// function yAxis() {
//     return h("g.axis.axisY.unselectable", [
//         yTick(0.0),
//         yTick(1.0),
//         h("path.domain", {d: "M-6,0H0V1H-6"}),
//     ]);
// }

// function yTick(y) {
//     return h("g.tick", {
//         style: "opacity: 1;",
//         transform: "translate(0," + y + ")",
//     }, [
//         h("line", {x2: "-6", y2: "0"}),
//         h("text", {
//             dy: ".32em",
//             style: "text-anchor: end;",
//             x: "-9",
//             y: "0",
//         }, [y.toFixed(1)]),
//     ]);
// }

// test("Axes2D.setAxesGeometry", assert => {
//     const document = new fixtures.Document(assert);
//     const div = document.document.createElement("div");

//     const axes = new Axes2D(div, {
//         "height": 100,
//         "maxValue": 1,
//         "minValue": 0,
//         "width": 100,
//     });

//     // assert.equal(div.innerHTML, dom.create(axesNode()).domNode.innerHTML);
//     assert.ok(div.isEqualNode(dom.create(axesNode()).domNode));
//     assert.equal(axes.width, 100);
//     assert.equal(axes.height, 100);
//     assert.equal(axes.axLeft, 100);
//     assert.equal(axes.axRight, 0);
//     assert.equal(axes.axBottom, 0);
//     assert.equal(axes.axTop, 0);
//     assert.equal(axes.tickSize, 0);
//     assert.equal(axes.tickPadding, 0);

//     axes.setAxesGeometry(50, 50);

//     assert.equal(div.innerHTML, "");

//     fixtures.teardown(assert, document);
// });
