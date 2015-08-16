/**
 * Line graph showing semantic pointer decoded values over time
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {float} args.min_value - minimum value on y-axis
 * @param {float} args.max_value - maximum value on y-axis
 * @param {Nengo.SimControl} args.sim - the simulation controller
 */

// this initialisation is basically the same as Value.js, but 
// I can't inherit it because it isn't part of the prototype
// is that worth changing?

Nengo.SpaSimilarity = function(parent, sim, args) {
    Nengo.Value.call(this, parent, sim, args);

    this.data_store = Nengo.VariableDataStore(this.n_lines, this.sim, args.synapse);

    var self = this;

    // create the legend from label args
    if(args.pointer_labels !== null){
        this.legend = document.createElement('div');
        this.legend.classList.add('legend', 'unselectable');
        this.div.appendChild(this.legend);

        // should the width be preset to something more useful?
        var legend_svg = d3.select(this.legend)
                           .append("svg")
                           .attr("width", 100)
                           .attr("height", 20*args.pointer_labels.length)

        legend_svg.selectAll('rect')
                  .data(args.pointer_labels)
                  .enter()
                  .append("rect")
                  .attr("x", 0)
                  .attr("y", function(d, i){ return i *  20;})
                  .attr("width", 10)
                  .attr("height", 10)
                  .style("fill", function(d, i) { 
                        return self.colors[i];
                   });
        
        legend_svg.selectAll('text')
                  .data(args.pointer_labels)
                  .enter()
                  .append("text")
                  .attr("x", 15)
                  .attr("y", function(d, i){ return i *  20 + 9;})
                  .text(function(d, i) {
                        return args.pointer_labels[i];
                   });

    }
};

Nengo.SpaSimilarity.prototype = Object.create(Nengo.Value.prototype);
Nengo.SpaSimilarity.prototype.constructor = Nengo.SpaSimilarity;

Nengo.SpaSimilarity.prototype.on_message = function(event) {
    var push_data = JSON.parse(event.data);

    if(push_data.length !== this.n_lines){
      this.data_store.dims = push_data.length;
      this.n_lines = push_data.length;
    }

    this.data_store.push(push_data);
    this.schedule_update();
}

/**
 * Redraw the lines and axis due to changed data
 */
Nengo.SpaSimilarity.prototype.update = function() {
    /** let the data store clear out old values */
    this.data_store.update();

    /** determine visible range from the Nengo.SimControl */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    this.axes2d.set_time_range(t1, t2);

    /** update the lines */
    var self = this;
    // this is getting the right data, but the format is ridiculous
    // this might be the problem
    // can D3.js even handle spontaneously created lines?
    var shown_data = this.data_store.get_shown_data();
    // this is going to break. maybe add zeros?
    // can I tell it how many lines?
    // can I add and remove lines
    var line = d3.svg.line()
        .x(function(d, i) {
            return self.axes2d.scale_x(
                self.data_store.times[i + self.data_store.first_shown_index]);
            })
        .y(function(d) {return self.axes2d.scale_y(d);})
    this.path.data(shown_data)
             .attr('d', line);
};

// TODO: add pairs functionality
Nengo.SpaSimilarity.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set range...', function() {self.set_range();}]);

    /*
    if (this.show_pairs) {
        items.push(['Hide pairs', function() {self.set_show_pairs(false);}]);
    } else {
        items.push(['Show pairs', function() {self.set_show_pairs(true);}]);
    }
    */

    // add the parent's menu items to this
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, Nengo.Component.prototype.generate_menu.call(this));
};

// TODO: should I remove the ability to set range?
// Or limit it to something intuitive
