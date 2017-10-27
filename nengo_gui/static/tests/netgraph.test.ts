// import { dom, h } from "maquette";
import * as test from "tape";

import * as fixtures from "./fixtures";

import { NetGraph } from "../netgraph";
import { MockConnection } from "../server";

test("NetGraph.createNode", assert => {
    const dom = new fixtures.DOM(assert);
    const netGraph = new NetGraph(new MockConnection());

    const ngiArg = {ng: netGraph,
        width: 100, height: 100,
        posX: 100, posY: 100,
        dimensions: 1, parent: null,
        uid: "node1",
    };

    const interArg = {miniItem: 1, label: "test_node"};

    // netGraph.createNode(ngiArg, interArg, false);

    fixtures.teardown(assert, dom);
});
