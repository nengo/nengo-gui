/**
 * Shows an image or pixel grid over time
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.miny - minimum value on y-axis
 * @param {float} args.maxy - maximum value on y-axis
 * @param {Nengo.SimControl} args.sim - the simulation controller
 */

Nengo.Image = function(parent, sim, args) {
    var self = this;

    Nengo.Component.call(self, parent, args);
    self.sim = sim;
    self.display_time = args.display_time;
    self.pixels_x = args.pixels_x;
    self.pixels_y = args.pixels_y;
    self.n_pixels = self.pixels_x * self.pixels_y;

    /** for storing the accumulated data */
    self.data_store = new Nengo.DataStore(self.n_pixels, self.sim, 0);

    /** draw the plot as an SVG */
    self.svg = d3.select(self.div).append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('style', [
            'padding-top:', '2em',
        ].join(""));

    /** call schedule_update whenever the time is adjusted in the SimControl */
    self.sim.div.addEventListener('adjust_time',
            function(e) {self.schedule_update();}, false);

    /** create the image */
    self.image = self.svg.append("image")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("style", [
            "image-rendering: -webkit-optimize-contrast;",
            "image-rendering: -moz-crisp-edges;",
            "image-rendering: pixelated;"
        ].join(""));

    self.canvas = document.createElement('CANVAS');
    self.canvas.width = self.pixels_x;
    self.canvas.height = self.pixels_y;

    self.on_resize(this.get_screen_width(), this.get_screen_height());

};
Nengo.Image.prototype = Object.create(Nengo.Component.prototype);
Nengo.Image.prototype.constructor = Nengo.Image;

/**
 * Receive new line data from the server
 */
Nengo.Image.prototype.on_message = function(event) {
    var data = new Uint8Array(event.data);
    var msg_size = this.n_pixels + 4;

    for (var i = 0; i < data.length; i += msg_size) {
        var time_data = new Float32Array(event.data.slice(i, i + 4));
        data = Array.prototype.slice.call(data, i + 3, i + msg_size);
        data[0] = time_data[0];
        this.data_store.push(data);
    }
    this.schedule_update();
}

/**
 * Redraw the lines and axis due to changed data
 */
Nengo.Image.prototype.update = function() {
    var self = this;

    /** let the data store clear out old values */
    self.data_store.update();

    var data = self.data_store.get_last_data();
    var ctx = self.canvas.getContext("2d");
    var imgData = ctx.getImageData(0, 0, self.pixels_x, self.pixels_y);
    for (var i = 0; i < self.n_pixels; i++) {
        imgData.data[4*i + 0] = data[i];
        imgData.data[4*i + 1] = data[i];
        imgData.data[4*i + 2] = data[i];
        imgData.data[4*i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    var dataURL = self.canvas.toDataURL("image/png");

    self.image.attr("xlink:href", dataURL);
};

/**
 * Adjust the graph layout due to changed size
 */
Nengo.Image.prototype.on_resize = function(width, height) {
    var self = this;
    if (width < self.minWidth) {
        width = self.minWidth;
    }
    if (height < self.minHeight) {
        height = self.minHeight;
    };

    self.svg
        .attr("width", width)
        .attr("height", height);

    self.update();

    self.label.style.width = width;

    self.width = width;
    self.height = height;
    self.div.style.width = width;
    self.div.style.height = height;
};
