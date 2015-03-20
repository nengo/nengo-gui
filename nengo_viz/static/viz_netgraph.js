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

    this.svg = this.createSVGElement('svg');
    this.svg.classList.add('netgraph');    
    this.svg.style.width = '100%';
    this.svg.style.height = 'calc(100% - 80px)';
    this.svg.style.position = 'fixed';
    args.parent.appendChild(this.svg);
    this.parent = args.parent;
        
    /** connect to server */
    this.ws = new WebSocket('ws://localhost:8080/viz_component?id=' + args.id);
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = function(event) {self.on_message(event);}

    /** respond to resize events */
    this.svg.addEventListener("resize", function() {self.on_resize();});
    window.addEventListener("resize", function() {self.on_resize();});
    
    this.svg_objects = {};
};

/** Event handler for received WebSocket messages */
VIZ.NetGraph.prototype.on_message = function(event) {
    console.log(event.data);
    data = JSON.parse(event.data);
    if (data.type != 'conn') {
        this.create_object(data);
    }
};  

VIZ.NetGraph.prototype.createSVGElement = function(tag) {
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}


VIZ.NetGraph.prototype.create_object = function(info) {
    var item = new VIZ.NetGraphItem(this, info);
    this.svg_objects[info.uid] = item;    
};

VIZ.NetGraph.prototype.on_resize = function(event) {

};

VIZ.NetGraphItem = function(ng, info) {
    this.ng = ng;
    this.pos = info.pos;
    this.size = info.size;
    this.type = info.type;
    this.uid = info.uid;

    var g = this.ng.createSVGElement('g');
    this.g = g;
    ng.svg.appendChild(g);
    g.classList.add(this.type);
    
    var w = this.ng.svg.clientWidth;
    var h = this.ng.svg.clientHeight;    
    
    g.setAttribute('transform', 'translate(' + info.pos[0]*w + ', ' + info.pos[1]*h + ')');
    

    var shape;
    if (info.type == 'node') {
        shape = this.ng.createSVGElement('rect');
        shape.setAttribute('transform', 'translate(-' + info.size[0]*w + ', -' + info.size[1]*h + ')')
        shape.setAttribute('width', info.size[0] * 2 * w);
        shape.setAttribute('height', info.size[1] * 2 * h);
        g.appendChild(shape);
    } else if (info.type == 'net') {
        shape = this.ng.createSVGElement('rect');
        shape.setAttribute('transform', 'translate(-' + info.size[0]*w + ', -' + info.size[1]*h + ')')
        shape.setAttribute('width', info.size[0] * 2 * w);
        shape.setAttribute('height', info.size[1] * 2 * h);
        shape.setAttribute('rx', '15');
        shape.setAttribute('ry', '15');
        g.appendChild(shape);
    } else {
        shape = this.ng.createSVGElement('ellipse');
        shape.setAttribute('cx', '0');
        shape.setAttribute('cy', '0');
        shape.setAttribute('rx', info.size[0] * w);
        shape.setAttribute('ry', info.size[1] * h);
        g.appendChild(shape);
    }
    
    var label = this.ng.createSVGElement('text');
    label.innerHTML = info.label;
    g.appendChild(label);

    var uid = this.uid;
    var ng = ng;
    interact(shape)
        .draggable({
            inertia: true,
            onmove: function(event) {
                var w = ng.svg.clientWidth;
                var h = ng.svg.clientHeight;    
                var item = ng.svg_objects[uid];
                item.pos = [item.pos[0] + event.dx/w, item.pos[1] + event.dy/h];
    
                g.setAttribute('transform', 'translate(' + item.pos[0]*w + ', ' + item.pos[1]*h + ')');
            }});
    
};




