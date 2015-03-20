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
    var g = this.createSVGElement('g');
    this.svg.appendChild(g);
    g.classList.add(info.type);
    
    var w = this.svg.clientWidth;
    var h = this.svg.clientHeight;    
    
    g.setAttributeNS(null, 'transform', 'translate(' + info.pos[0]*w + ', ' + info.pos[1]*h + ')');
    

    var shape;
    if (info.type == 'node') {
        shape = this.createSVGElement('rect');
        shape.setAttribute('transform', 'translate(-' + info.size[0]*w + ', -' + info.size[1]*h + ')')
        shape.setAttributeNS(null, 'width', info.size[0] * 2 * w);
        shape.setAttributeNS(null, 'height', info.size[1] * 2 * h);
        g.appendChild(shape);
    } else if (info.type == 'net') {
        shape = this.createSVGElement('rect');
        shape.setAttribute('transform', 'translate(-' + info.size[0]*w + ', -' + info.size[1]*h + ')')
        shape.setAttributeNS(null, 'width', info.size[0] * 2 * w);
        shape.setAttributeNS(null, 'height', info.size[1] * 2 * h);
        shape.setAttribute('rx', '15');
        shape.setAttribute('ry', '15');
        g.appendChild(shape);
    } else {
        shape = this.createSVGElement('ellipse');
        shape.setAttributeNS(null, 'cx', '0');
        shape.setAttributeNS(null, 'cy', '0');
        shape.setAttributeNS(null, 'rx', info.size[0] * w);
        shape.setAttributeNS(null, 'ry', info.size[1] * h);
        g.appendChild(shape);
    }
    
    var label = this.createSVGElement('text');
    label.innerHTML = info.label;
    g.appendChild(label);
    
    this.svg_objects[info.name] = g;    
};

VIZ.NetGraph.prototype.on_resize = function(event) {

};


