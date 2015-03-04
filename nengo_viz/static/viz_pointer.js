/**
 * Decoded pointer display
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see VIZ.Component)
 * @param {VIZ.SimControl} args.sim - the simulation controller
 */
 
VIZ.Pointer = function(args) {
    VIZ.Component.call(this, args);
    var self = this;

    this.sim = args.sim;
        
    this.pdiv = document.createElement('div');
    this.pdiv.style.width = args.width;
    this.pdiv.style.height = args.height;
    VIZ.set_transform(this.pdiv, 0, 0);
    this.pdiv.style.position = 'fixed';
    this.pdiv.classList.add('pointer');
    this.div.appendChild(this.pdiv);
    
    /** for storing the accumulated data */
    this.data_store = new VIZ.DataStore(1, this.sim, 0);

    /** call schedule_update whenever the time is adjusted in the SimControl */    
    this.sim.div.addEventListener('adjust_time', 
            function(e) {self.schedule_update();}, false);
    
    this.on_resize(args.width, args.height);
};
VIZ.Pointer.prototype = Object.create(VIZ.Component.prototype);
VIZ.Pointer.prototype.constructor = VIZ.Pointer;

/**
 * Receive new line data from the server
 */
VIZ.Pointer.prototype.on_message = function(event) {
    data = event.data.split(" ");
    var time = parseFloat(data[0]);
    
    var items = data[1].split(";");
    
    this.data_store.push([time, items]);
    this.schedule_update();
}
   
/**
 * Redraw the lines and axis due to changed data
 */
VIZ.Pointer.prototype.update = function() {
    /** let the data store clear out old values */
    this.data_store.update();
    
    var data = this.data_store.get_last_data()[0];
    
    while(this.pdiv.firstChild) {
        this.pdiv.removeChild(this.pdiv.firstChild);
    }
    this.pdiv.style.width = this.width;
    this.pdiv.style.height = this.height;
    
    if (data === undefined) {
        return;
    }
    
    var total_size = 0;
    
    var items = [];
    
    for (var i=0; i < data.length; i++) {
        var size = parseFloat(data[i].substring(0,4));
        var span = document.createElement('span');
        span.innerHTML = data[i].substring(4);
        this.pdiv.appendChild(span);
        total_size += size;
        var c = Math.floor(255 - 255 * size);
        if (c<0) c = 0;
        if (c>255) c = 255;
        span.style.color = 'rgb('+c+','+c+','+c+')';
        items.push(span);
    }
    
    var scale = this.height / total_size * 0.75;
    
    for (var i=0; i < data.length; i++) {
        var size = parseFloat(data[i].substring(0,4));
        items[i].style.fontSize = '' + (size * scale) + 'px'
    }

    return;
        
    /** determine visible range from the VIZ.SimControl */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;
    this.scale_x.domain([t1, t2]);
    
    /** update the lines */
    var self = this;
    var shown_data = this.data_store.get_shown_data();
    var line = d3.svg.line()
        .x(function(d, i) {
            return self.scale_x(
                self.data_store.times[i + self.data_store.first_shown_index]);
            })
        .y(function(d) {return self.scale_y(d);})
    this.path.data(shown_data)
             .attr('d', line);

    this.axis_time_start.textContent =  t1.toFixed(3);

    this.axis_time_end.textContent =  t2.toFixed(3);

    /** update the x-axis */
    this.axis_x_g.call(this.axis_x);         
};

/** 
 * Adjust the graph layout due to changed size
 */
VIZ.Pointer.prototype.on_resize = function(width, height) {
    this.width = width;
    this.height = height;

    this.label.style.width = width;
    
    this.update();
};
