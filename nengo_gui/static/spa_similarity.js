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
    // probably have to fix the args here
    Nengo.Value.call(this, parent, sim, args);

    var self = this;

    // create the legend from label args
    if(args.pointer_labels !== null){
        this.legend = document.createElement('div');
        // maybe make this selectable later for long stuff?
        this.legend.classList.add('legend', 'unselectable');
        this.div.appendChild(this.legend);

        // okay, so this is where the D3.js magic comes in?
        // how to I attach to this properly
        // will this.svg help?
        // can I just select this.legend?
        var legend_svg = d3.select(this.legend)
                           .append("svg")
                           .attr("width", 100)
                           .attr("height", 100)
                           .attr("transform", 'translate(-20,50)')

        //the position of these rectangles is being set very baddly
        legend_svg.selectAll('rect')
                  .data(args.pointer_labels)
                  .enter()
                  .append("rect")
                  .attr("x", 
                    self.x + self.w - 65
                    )
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
                  .attr("x", self.x + self.w - 52)
                  .attr("y", function(d, i){ return i *  20 + 9;})
                  .text(function(d, i) {
                        return args.pointer_labels[i];
                   });

    }
};

Nengo.SpaSimilarity.prototype = Object.create(Nengo.Value.prototype);
Nengo.SpaSimilarity.prototype.constructor = Nengo.SpaSimilarity;


/**
 * Redraw the lines and axis due to changed data
 */
Nengo.SpaSimilarity.prototype.update = function() {
    /** let the data store clear out old values */
    // where the hell is this datastore defined anyways?
    this.data_store.update();

    /** determine visible range from the Nengo.SimControl */
    var t1 = this.sim.time_slider.first_shown_time;
    var t2 = t1 + this.sim.time_slider.shown_time;

    this.axes2d.set_time_range(t1, t2);

    /** update the lines */
    var self = this;
    // Is it the data being sent in the wrong way or 
    var shown_data = this.data_store.get_shown_data();
    var line = d3.svg.line()
        .x(function(d, i) {
            return self.axes2d.scale_x(
                self.data_store.times[i + self.data_store.first_shown_index]);
            })
        .y(function(d) {return self.axes2d.scale_y(d);})
    this.path.data(shown_data)
             .attr('d', line);
};

// This is kind of useless. Should we just kill it? Same with set_range and update_range
// I guess we'll need this menu to show pairs or not?
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
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, Nengo.Component.prototype.generate_menu.call(this));
};

// Change the legend in addition to the usual stuff
Nengo.SpaSimilarity.prototype.layout_info = function () {
    var info = Nengo.Component.prototype.layout_info.call(this);
    info.min_value = this.axes2d.scale_y.domain()[0];
    info.max_value = this.axes2d.scale_y.domain()[1];
    return info;
}

Nengo.SpaSimilarity.prototype.update_layout = function(config) {
    this.update_range(config.min_value, config.max_value);
    Nengo.Component.prototype.update_layout.call(this, config);
}

// what do I want to with this range... I feel like this shouldn't even be an option...
Nengo.SpaSimilarity.prototype.set_range = function() {
    var range = this.axes2d.scale_y.domain();
    var self = this;
    Nengo.modal.title('Set graph range...');
    Nengo.modal.single_input_body(range, 'New range');
    Nengo.modal.footer('ok_cancel', function(e) {
        var new_range = $('#singleInput').val();
        var modal = $('#myModalForm').data('bs.validator');

        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        if (new_range !== null) {
            new_range = new_range.split(',');
            var min = parseFloat(new_range[0]);
            var max = parseFloat(new_range[1]);
            self.update_range(min, max);
            self.save_layout();
        }
        $('#OK').attr('data-dismiss', 'modal');
    });
    var $form = $('#myModalForm').validator({
        custom: {
            my_validator: function($item) {
                var nums = $item.val().split(',');
                var valid = false;
                if ($.isNumeric(nums[0]) && $.isNumeric(nums[1])) {
                    if (Number(nums[0]) < Number(nums[1])) {
                        valid = true; //Two numbers, 1st less than 2nd
                    }
                }
                return (nums.length==2 && valid);
            }
        },
    });

    $('#singleInput').attr('data-error', 'Input should be in the ' +
                           'form "<min>,<max>".');
    Nengo.modal.show();
    $('#OK').on('click', function () {
        var w = $(self.div).width();
        var h = $(self.div).height();
        self.on_resize(w, h);
    })
}

Nengo.SpaSimilarity.prototype.update_range = function(min, max) {
    this.axes2d.scale_y.domain([min, max]);
    this.axes2d.axis_y_g.call(this.axes2d.axis_y);
}
