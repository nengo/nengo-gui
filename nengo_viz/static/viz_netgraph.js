/**
 * Network diagram
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments, including:
 * @param {int} args.id - the id of the server-side NetGraph to connect to
 * @param {DOMElement} args.parent - the element to add this component to
 */
VIZ.NetGraph = function(args) {
    var self = this;

    this.div = document.createElement('div');
    this.div.classList.add('netgraph');    
    this.div.style.width = '100%';
    this.div.style.height = '100%';
    this.div.style.position = 'fixed';
    args.parent.appendChild(this.div);
    this.parent = args.parent;

    /** respond to resize events */
    this.div.addEventListener("resize", function() {self.on_resize();});
    window.addEventListener("resize", function() {self.on_resize();});
};

/** Event handler for received WebSocket messages */
VIZ.NetGraph.prototype.on_message = function(event) {
    var data = new Float32Array(event.data);
    this.time = data[0];
    this.rate = data[1];
};    

VIZ.SimControl.prototype.on_resize = function(event) {

}
