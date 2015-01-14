/** namespace for all Nengo visualization */
var VIZ = {};

/**
 * Helper function to set the transform of an element.
 */
VIZ.set_transform = function(element, x, y) {
    element.style.webkitTransform = 
        element.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
}

/** 
 * Base class for interactive visualization
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments, including:
 * @param {DOMElement} args.parent - the element to add this component to
 * @param {float} args.x - the left side of the component (in pixels)
 * @param {float} args.y - the top of the component (in pixels)
 * @param {float} args.width - the width of the component (in pixels)
 * @param {float} args.height - the height of the component (in pixels)
 * @param {int} args.id - the id of the server-side component to connect to
 */
VIZ.Component = function(args) {
    var self = this;

    /** Create the div for the component and position it */
    this.div = document.createElement('div');
    this.div.style.width = args.width;
    this.div.style.height = args.height;
    VIZ.set_transform(this.div, args.x, args.y);
    this.div.style.position = 'fixed';
    this.div.classList.add('graph');
    args.parent.appendChild(this.div);
    this.parent = args.parent;
    

    /** Move element to be drawn on top when clicked on */
    this.div.onmousedown = function(event) {
        self.parent.removeChild(self.div);
        self.parent.appendChild(self.div);
    };
    this.div.ontouchstart = this.div.onmousedown;
    
    /** Allow element to be dragged */ 
    this.div.setAttribute('data-x', args.x);
    this.div.setAttribute('data-y', args.y);
    interact(this.div)
        .draggable({
            inertia: true,
            restrict: {
                restriction: "parent",
                endOnly: true,
                elementRect: {top: 0, left: 0, bottom: 1, right: 1 }
            },
            onmove: function (event) {
                var target = event.target;
                var x = parseFloat(target.getAttribute('data-x')) + event.dx;
                var y = parseFloat(target.getAttribute('data-y')) + event.dy;
                VIZ.set_transform(target, x, y);
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);                  
            }
        })

    /** Allow element to be resized */ 
    interact(this.div)
        .resizable(true)
        .on('resizemove', function(event) {
            var target = event.target;
            var newWidth = parseFloat(target.style.width) + event.dx;
            var newHeight = parseFloat(target.style.height) + event.dy;
            target.style.width  = newWidth + 'px';
            target.style.height = newHeight + 'px';
            self.on_resize(newWidth, newHeight);
        });    

    /** Open a WebSocket to the server */
    this.id = args.id;
    if (this.id != undefined) {
        this.ws = new WebSocket('ws://localhost:8080/viz_component?id=' + 
                                this.id);
        this.ws.binaryType = "arraybuffer";
        this.ws.onmessage = function(event) {self.on_message(event);}
    }
};

/**
 * Method to be called when Component is resized
 */
VIZ.Component.prototype.on_resize = function(width, height) {};

/**
 * Method to be called when Component received a WebSocket message
 */
VIZ.Component.prototype.on_message = function(event) {};


VIZ.DataStore = function(dims, sim, synapse) {
    this.synapse = synapse;
    this.sim = sim;
    this.times = []
    this.data = [];
    for (var i=0; i < dims; i++) {
        this.data.push([]);
    }
}

VIZ.DataStore.prototype.push = function(row) {
    var decay = 0.0;    
    if (this.times.length != 0) {
        var dt = row[0] - this.times[this.times.length - 1];
        decay = Math.exp(-dt / this.synapse);
    }
    for (var i = 0; i < this.data.length; i++) {
        if (decay == 0.0) {
            this.data[i].push(row[i + 1]);        
        } else {
            this.data[i].push(row[i + 1]*(1-decay) + this.data[i][this.data[i].length - 1] * decay);
        }
    }
    this.times.push(row[0]);
};


VIZ.DataStore.prototype.update = function() {
    var extra = 0;
    var limit = this.sim.time_slider.last_time - this.sim.time_slider.kept_time;
    while (this.times[extra] < limit) {
        extra += 1;
    }
    if (extra > 0) {
        console.log('ignoring ' +extra);
        this.times = this.times.slice(extra);
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = this.data[i].slice(extra);
        }
    }
}

VIZ.DataStore.prototype.get_shown_data = function() {
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;
    
    var index = 0;
    while (this.times[index] < t1) {
        index += 1;
    }
    var last_index = index;
    while (this.times[last_index] < t2 && last_index < this.times.length) {
        last_index += 1;
    }
    this.first_shown_index = index;
    
    console.log([index, last_index]);

    var shown = [];
    for (var i = 0; i < this.data.length; i++) {
        shown.push(this.data[i].slice(index, last_index));
    }
    return shown
}

