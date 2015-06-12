/**
 * Decoded pointer display
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {Nengo.SimControl} args.sim - the simulation controller
 */

Nengo.HTMLView = function(parent, sim, args) {
    Nengo.Component.call(this, parent, args);
    var self = this;

    this.sim = sim;

    this.pdiv = document.createElement('div');
    this.pdiv.style.width = '100%';
    this.pdiv.style.height = '100%';
    Nengo.set_transform(this.pdiv, 0, 0);
    this.pdiv.style.position = 'fixed';
    this.pdiv.classList.add('htmlview');
    this.div.appendChild(this.pdiv);

    /** for storing the accumulated data */
    this.data_store = new Nengo.DataStore(1, this.sim, 0);

    /** call schedule_update whenever the time is adjusted in the SimControl */
    this.sim.div.addEventListener('adjust_time',
            function(e) {self.schedule_update();}, false);

    this.on_resize(this.get_screen_width(), this.get_screen_height());



};
Nengo.HTMLView.prototype = Object.create(Nengo.Component.prototype);
Nengo.HTMLView.prototype.constructor = Nengo.Pointer;


/**
 * Receive new line data from the server
 */
Nengo.HTMLView.prototype.on_message = function(event) {
    var data = event.data.split(" ", 1);
    var time = parseFloat(data[0]);

    var msg = event.data.substring(data[0].length + 1);

    this.data_store.push([time, msg]);
    this.schedule_update();
}

/**
 * Redraw the lines and axis due to changed data
 */
Nengo.HTMLView.prototype.update = function() {
    /** let the data store clear out old values */
    this.data_store.update();

    var data = this.data_store.get_last_data()[0];

    if (data === undefined) {
        data = '';
    }

    this.pdiv.innerHTML = data;

};

/**
 * Adjust the graph layout due to changed size
 */
Nengo.HTMLView.prototype.on_resize = function(width, height) {
    if (width < this.minWidth) {
        width = this.minWidth;
    }
    if (height < this.minHeight) {
        height = this.minHeight;
    };

    this.width = width;
    this.height = height;
    //this.div.style.width = width;
    //this.div.style.height = height;

    this.label.style.width = width;

    this.update();
};
