/**
 * Line graph showing semantic pointer decoded values over time
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {int} args.n_lines - number of decoded values
 * @param {Nengo.SimControl} args.sim - the simulation controller
 */

Nengo.SpaSimilarity = function(parent, sim, args) {
    Nengo.Value.call(this, parent, sim, args);

    this.data_store = new Nengo.GrowableDataStore(this.n_lines, this.sim, args.synapse);
    this.show_pairs = false;

    var self = this;

    this.colors = Nengo.make_colors(6);
    this.color_func = function(d, i) {return self.colors[i % 6]};

    // create the legend from label args
    this.pointer_labels = args.pointer_labels;
    this.legend = document.createElement('div');
    this.legend.classList.add('legend', 'unselectable');
    this.div.appendChild(this.legend);
    this.legend_svg = Nengo.draw_legend(this.legend, args.pointer_labels, this.color_func);
};

Nengo.SpaSimilarity.prototype = Object.create(Nengo.Value.prototype);
Nengo.SpaSimilarity.prototype.constructor = Nengo.SpaSimilarity;

Nengo.SpaSimilarity.prototype.show_pairs_toggle = function(new_labels){
    // clear the database and make a new one
    self.data_store.reset();

    // delete the legend's children
    while(this.legend.lastChild){
        this.legend.removeChild(this.legend.lastChild);
    }

    // redraw all the legends
    this.pointer_labels = new_labels;
    this.legend_svg = Nengo.draw_legend(this.legend, new_labels, this.color_func);

}

Nengo.SpaSimilarity.prototype.data_msg = function(push_data){

    var data_dims = push_data.length - 1;

    // Move this check inside datastore?
    if(data_dims !== this.n_lines){
      this.data_store.dims = data_dims;
      this.n_lines = data_dims;
    }

    this.data_store.push(push_data);
    this.schedule_update();
};

Nengo.SpaSimilarity.prototype.update_legend = function(new_labels){
    // Should figure out how to mix recs and text into one

    var self = this;
    this.pointer_labels = this.pointer_labels.concat(new_labels);

    // expand the svg
    this.legend_svg.attr("height", 20 * this.pointer_labels.length);

    // Data join
    var recs = this.legend_svg.selectAll("rect").data(this.pointer_labels);
    var texts = this.legend_svg.selectAll("text").data(this.pointer_labels);
    // enter to append remaining lines
    recs.enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function(d, i){ return i *  20;})
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", this.color_func);

    texts.enter()
          .append("text")
          .attr("x", 15)
          .attr("y", function(d, i){ return i *  20 + 9;})
          .html(function(d, i) {
                return self.pointer_labels[i];
           });

};

/* there a three types of messages that can be received:
    - a legend needs to be updated
    - the data has been updated
    - show_pairs has been toggled
    this calls the method associated to handling the type of message
*/
Nengo.SpaSimilarity.prototype.on_message = function(event) {
    var data = JSON.parse(event.data);
    var func_name = data.shift();
    this[func_name](data);
};

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
    var shown_data = this.data_store.get_shown_data();
    // Data join
    this.path = this.axes2d.svg.selectAll(".line").data(shown_data);
    // update
    this.path.attr('d', self.line);
    // enter to append remaining lines
    this.path.enter()
             .append('path')
             .attr('class', 'line')
             .style('stroke', this.color_func)
             .attr('d', self.line);
    // remove any lines that aren't needed anymore
    this.path.exit().remove();

    /* update the legend text */
    if(this.legend_svg && shown_data[0].length !== 0){
        // get the most recent similarity
        var latest_simi = [];
        for(var i = 0; i < shown_data.length; i++){
            latest_simi.push(shown_data[i][shown_data[i].length - 1]);
        }

        // update the text in the legend
        var texts = this.legend_svg.selectAll("text").data(this.pointer_labels);

        texts.attr("x", 15)
              .attr("y", function(d, i){ return i *  20 + 9;})
              .html(function(d, i) {
                    var sign = "&nbsp;&nbsp;&nbsp;";
                    if(latest_simi[i] < 0){
                        sign = "&nbsp;&minus;";
                    }
                    return self.pointer_labels[i] + " " + sign + Math.abs(latest_simi[i]).toFixed(2);
               });
    }

};

Nengo.SpaSimilarity.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['Set range...', function() {self.set_range();}]);

    if (this.show_pairs) {
        items.push(['Hide pairs', function() {self.set_show_pairs(false);}]);
    } else {
        items.push(['Show pairs', function() {self.set_show_pairs(true);}]);
    }

    if(self.sort_legend){
        items.push(["Show all legend labels", function() {self.sort_legend = false}]);
    } else {
        items.push(['Sort and Limit Legend', function() {self.sort_legend = true}]);
    }

    // add the parent's menu items to this
    return $.merge(items, Nengo.Component.prototype.generate_menu.call(this));
};

Nengo.SpaSimilarity.prototype.set_show_pairs = function(value) {
    if (this.show_pairs !== value) {
        this.show_pairs = value;
        this.save_layout();
    }
};

Nengo.SpaSimilarity.prototype.layout_info = function () {
    var info = Nengo.Component.prototype.layout_info.call(this);
    info.show_pairs = this.show_pairs;
    info.min_value = this.axes2d.scale_y.domain()[0];
    info.max_value = this.axes2d.scale_y.domain()[1];
    return info;
}

Nengo.SpaSimilarity.prototype.update_layout = function (config) {
    this.update_range(config.min_value, config.max_value);
    this.show_pairs = config.show_pairs;
    Nengo.Component.prototype.update_layout.call(this, config);
}

// TODO: should I remove the ability to set range?
// Or limit it to something intuitive
