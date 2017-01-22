// import { dom, h } from "maquette";
import * as test from "tape";

import * as fixtures from "./fixtures";

import { NetGraph } from "../netgraph/netgraph";
import { MockConnection } from "../websocket";

test("NetGraph.createNode", assert => {
    const dom = new fixtures.DOM(assert);
    const ng = new NetGraph("uid");

    const ngiArg = {ng: ng,
        width: 100, height: 100,
        posX: 100, posY: 100,
        dimensions: 1, parent: null,
        uid: "node1",
    };
    
    ng.createNode(ngiArg);

    fixtures.teardown(assert, dom);
});