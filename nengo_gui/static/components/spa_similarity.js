/**
 * Line graph showing semantic pointer decoded values over time
 * @constructor
 *
 * @param {DOMElement} parent - the element to add this component to
 * @param {Nengo.SimControl} sim - the simulation controller
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {int} args.n_lines - number of decoded values
 */

Nengo.SpaSimilarity = function(parent, sim, args) {
    Nengo.Value.call(this, parent, sim, args);

    this.synapse = args.synapse;
    this.data_store = new Nengo.GrowableDataStore(this.n_lines, this.sim, this.synapse);
    this.show_pairs = false;

    var self = this;

    this.colors = Nengo.make_colors(6);
    this.color_func = function(d, i) {return self.colors[i % 6]};

    this.line.defined(function(d) { return !isNaN(d)});

    // create the legend from label args
    this.pointer_labels = args.pointer_labels;
    this.legend = document.createElement('div');
    this.legend.classList.add('legend', 'unselectable');
    this.div.appendChild(this.legend);
    this.legend_svg = Nengo.draw_legend(this.legend, args.pointer_labels, this.color_func);
};

Nengo.SpaSimilarity.prototype = Object.create(Nengo.Value.prototype);
Nengo.SpaSimilarity.prototype.constructor = Nengo.SpaSimilarity;


Nengo.SpaSimilarity.prototype.reset_legend_and_data = function(new_labels){
    // clear the database and create a new one since the dimensions have changed
    this.data_store = new Nengo.GrowableDataStore(new_labels.length, this.sim, this.synapse);

    // delete the legend's children
    while(this.legend.lastChild){
        this.legend.removeChild(this.legend.lastChild);
    }
    this.legend_svg = d3.select(this.legend).append("svg");

    // redraw all the legends if they exist
    this.pointer_labels = [];
    if(new_labels[0] != ""){
        this.update_legend(new_labels);
    }

    this.update();

}

Nengo.SpaSimilarity.prototype.data_msg = function(push_data){

    var data_dims = push_data.length - 1;

    // TODO: Move this check inside datastore?
    if(data_dims > this.data_store.dims){
      this.data_store.dims = data_dims;
      this.n_lines = data_dims;
    }

    this.data_store.push(push_data);
    this.schedule_update();
};

Nengo.SpaSimilarity.prototype.update_legend = function(new_labels){

    var self = this;
    this.pointer_labels = this.pointer_labels.concat(new_labels);

    // expand the height of the svg, where "20" is around the height of the font
    this.legend_svg.attr("height", 20 * this.pointer_labels.length);


    // Data join
    var recs = this.legend_svg.selectAll("rect").data(this.pointer_labels);
    var legend_labels = this.legend_svg.selectAll(".legend-label").data(this.pointer_labels);
    var val_texts = this.legend_svg.selectAll(".val").data(this.pointer_labels);
    // enter to append remaining lines
    recs.enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function(d, i){ return i *  20;})
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", this.color_func);

    legend_labels.enter().append("text")
          .attr("x", 15)
          .attr("y", function(d, i){ return i *  20 + 9;})
          .attr("class", "legend-label")
          .html(function(d, i) {
                return self.pointer_labels[i];
           });

    // expand the width of the svg of the longest string
    var label_list = $(".legend-label").toArray();
    var longest_label = label_list.sort(
                            function (a, b) { return b.getBBox().width - a.getBBox().width; }
                        )[0];
    // "50" is for the similarity measure that is around three characters wide
    var svg_right_edge = longest_label.getBBox().width + 50;
    this.legend_svg.attr("width", svg_right_edge);

    val_texts.attr("x", svg_right_edge)
            .attr("y", function(d, i){ return i *  20 + 9;});
    val_texts.enter().append("text")
            .attr("x", svg_right_edge)
            .attr("y", function(d, i){ return i *  20 + 9;})
            .attr("text-anchor","end")
            .attr("class", "val");
};

/* there are three types of messages that can be received:
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
        var texts = this.legend_svg.selectAll(".val").data(this.pointer_labels);

        texts.html(function(d, i) {
                var sign = '';
                if(latest_simi[i] < 0){
                    sign = "&minus;";
                }
                return sign + Math.abs(latest_simi[i]).toFixed(2);
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

    // add the parent's menu items to this
    return $.merge(items, Nengo.Component.prototype.generate_menu.call(this));
};

Nengo.SpaSimilarity.prototype.set_show_pairs = function(value) {
    if (this.show_pairs !== value) {
        this.show_pairs = value;
        this.save_layout();
        this.ws.send(value);
    }
};

Nengo.SpaSimilarity.prototype.layout_info = function () {
    var info = Nengo.Component.prototype.layout_info.call(this);
    info.show_pairs = this.show_pairs;
    info.min_value = this.axes2d.scale_y.domain()[0];
    info.max_value = this.axes2d.scale_y.domain()[1];
    return info;
}

Nengo.SpaSimilarity.prototype.update_layout = function(config) {
    this.update_range(config.min_value, config.max_value);
    this.show_pairs = config.show_pairs;
    Nengo.Component.prototype.update_layout.call(this, config);
}

Nengo.SpaSimilarity.prototype.reset = function () {
    // ask for a legend update
    this.ws.send("reset_legend");
}

// TODO: should I remove the ability to set range?
// Or limit it to something intuitive
