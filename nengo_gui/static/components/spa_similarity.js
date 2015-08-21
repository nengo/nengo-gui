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

Nengo.SpaSimilarity = function(parent, sim, args) {
    Nengo.Value.call(this, parent, sim, args);

    this.data_store = new Nengo.VariableDataStore(this.n_lines, this.sim, args.synapse);

    var self = this;

    // I doubt this matters... Maybe I should make it loop?
    this.colors = Nengo.make_colors(this.n_lines*2);

    // create the legend from label args
    if(args.pointer_labels !== null){
        this.pointer_labels = args.pointer_labels;
        this.legend = document.createElement('div');
        this.legend.classList.add('legend', 'unselectable');
        this.div.appendChild(this.legend);

        this.legend_svg = d3.select(this.legend)
                           .append("svg")
                           .attr("width", 100)
                           .attr("height", 20*args.pointer_labels.length);

        this.legend_svg.selectAll('rect')
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
        
        this.legend_svg.selectAll('text')
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

Nengo.SpaSimilarity.prototype.data_msg = function(push_data){

    this.create_subtitle(push_data)
    var data_dims = push_data.length - 1;

    if(data_dims !== this.n_lines){
      this.data_store.dims = data_dims;
      this.n_lines = data_dims;
    }

    this.data_store.push(push_data);
    this.schedule_update();
};

Nengo.SpaSimilarity.prototype.update_legend = function(new_label){
    // Should figure out how to mix recs and text into one
    var self = this;
    this.pointer_labels.push(new_label[0]);

    // expand the svg
    this.legend_svg.attr("height", 20*this.pointer_labels.length)

    // Data join
    var recs = this.legend_svg.selectAll("rect").data(this.pointer_labels);
    var texts = this.legend_svg.selectAll("text").data(this.pointer_labels);
    // nothing to update
    // enter to append remaining lines
    recs.enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function(d, i){ return i *  20;})
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", function(d, i) { 
              return self.colors[i];
        });

    texts.enter()
          .append("text")
          .attr("x", 15)
          .attr("y", function(d, i){ return i *  20 + 9;})
          .text(function(d, i) {
                return self.pointer_labels[i];
           });

};


Nengo.SpaSimilarity.prototype.on_message = function(event) {
    var data = JSON.parse(event.data);
    var func_name = data.shift();
    this[func_name](data);  
};

Nengo.SpaSimilarity.prototype.create_subtitle = function(data) {
    
    //extract the max similarity value
    var length = data.length;
    var sub_data = data.slice(1,length)
    var max_data = Math.max.apply(Math, sub_data)
    
    //find all the show all having the max similarity??
    /*var index
    while( ( index = data.indexOf( max_data ) ) != -1 ){
        results.push( index + results.length )
        data.splice( ind, 1 )
    }
    return results;*/
    
    //create the subtitle
    var ind = data.indexOf(max_data)-1
    var subtitle = this.pointer_labels[ind] + "(" + max_data + ")";
    
    //add the subtitle to the div
    title = this.label;
    var para = document.createElement("p");
    var node = document.createTextNode(subtitle);
    para.appendChild(node);
    var element = title
    
    //remove all the child nodes(paras) from the title element
    while(element.children.length>0) {
        element.removeChild(element.children[0]);
    }
    
    //add the current subtitle to the title element
    element.appendChild(para);
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
    var shown_data = this.data_store.get_shown_data();
    // Data join
    this.path = this.axes2d.svg.selectAll(".line").data(shown_data);
    // update
    this.path.attr('d', self.line);
    // enter to append remaining lines
    this.path.enter()
             .append('path')
             .attr('class', 'line')
             .style('stroke', function(d, i) {return self.colors[i];})
             .attr('d', self.line);
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

Nengo.SpaSimilarity.prototype.set_show_pairs = function(value) {
    if (this.show_pairs !== value) {
        this.show_pairs = value;
        this.save_layout();
    }
};

// TODO: should I remove the ability to set range?
// Or limit it to something intuitive
