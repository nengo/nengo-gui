import { NetGraph } from "./netgraph";

/* tslint:disable:no-console */
document.addEventListener("DOMContentLoaded", () => {
    const netg = new NetGraph("test");
    document.body.appendChild(netg.view.root);
    netg.view.onResize(null);
    console.assert(netg.view.width !== 0);
    console.assert(netg.view.height !== 0);
    netg.createNode(
        {ng: netg, width: 100, height: 100, posX: 100, posY: 100,
            parent: null, uid: "node2"},
        {miniItem: 1, label: "test_node"}, 1, null);
    console.log("stuff is loaded");
});
