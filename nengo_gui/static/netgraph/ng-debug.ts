import { NetGraph } from "./netgraph";

/* tslint:disable:no-console */
document.addEventListener("DOMContentLoaded", () => {
    const netg = new NetGraph("test");
    console.log("stuff is loaded");
    document.body.appendChild(netg.view.root);
    netg.createNode(
        {ng: netg, width: 100, height: 100, posX: 100, posY: 100,
            parent: null, uid: "node2"},
        {miniItem: 1, label: "test_node"}, 1, null);
});
