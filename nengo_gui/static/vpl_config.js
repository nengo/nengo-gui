Nengo.VPLConfig = function(){
    this.$form =  $('<form id="ensModalForm">'+
    '<div class="form-group">'+
        '<div class="controls form-inline">'+
            '<label for="ens_dimension">Dimension</label>'+
            '<input type="number" class="form-control" id="ens_dimension" placeholder="1">'+
        '</div>'+
    '</div>'+
    '<div id="graph_container"></div>'+
    '<div class="form-group">'+
        '<label for="ex1">Radius</label>'+
        '<div class="controls form-inline">'+
            '<input type="text" class="form-control" id="radius_val" placeholder="1">'+
            '<input data-provide="slider" id="ex1"/>'+
        '</div>'+
    '</div>'+
    '<div class="form-group">'+
    '<label for="ens_model">Neuron Model</label>'+
        '<select class="form-control" id="ens_model">'+
        '<option>LIF (Default)'+
        '<option>LIF (Custom)</option>'+
        '<option>AdaptiveLIF</option>'+
        '</select>'+
    '</div>'+
'</form>');
    this.graph_container = $();
    this.graph_w = 500;
    this.radius = 1;
    self.radius_slider;
}

Nengo.VPLConfig.prototype.ensemble_modal = function(){
    var self = this;

    Nengo.modal.clear_body();
    Nengo.modal.show();
    Nengo.modal.title('Edit Ensemble');
    self.$form.appendTo(Nengo.modal.$body);
    this.graph_container.appendTo(this.$form);
    self.redraw_graph("#graph_container",[1,2,3],[[1,2,3],[4,5,6]],'radius','frequency')
    self.radius_slider = new Slider('#ex1',{
    	min: 0.1,
        max: 10,
        tooltip: "hide",
        value: 1,
        step: 0.1,
        id: "ex1C"
    })
    self.radius_slider.on("slide",function(){
        $("#radius_val").val($("#ex1").val());
        self.radius = $("#ex1").val();
        var x_axis = [];
        for(var x = 1; x <= 3; x++){
            x_axis.push((x/3)*self.radius);
        }
        self.redraw_graph("#graph_container",x_axis,[[1,2,3],[4,5,6]],'radius','frequency')
    });
    $("#radius_val").on("change",function(){
        var max_val = self.radius_slider.getAttribute("max");
        var value = parseInt($(this).val(),10);
        if (value > max_val){
            self.radius_slider.setAttribute("max",value);
        }
        self.radius_slider.setValue(value);
    })
}

Nengo.VPLConfig.prototype.redraw_graph = function(selector, x, ys, x_label, y_label){
    var self = this;
    $("#graph_container > svg").remove();
    self.graph_container.appendTo(this.$form);
    self.multiline_plot(selector, x, ys, x_label, y_label);
}

Nengo.VPLConfig.prototype.multiline_plot = function(selector, x, ys, x_label, y_label) {

    var margin = {left: 30, top: 0, right: 0, bottom: 30};
    var w = 500 - margin.left - margin.right;
    var h = 220 - margin.bottom - margin.top;
    var graph_w = w + margin.left + margin.right;
    var graph_h = h + margin.bottom + margin.top;
    var text_offset = 15;

    var scale_x = d3.scale.linear()
        .domain([  x[0], x[x.length - 1]  ])
        .range([margin.left, w - margin.right]);
    var scale_y = d3.scale.linear()
        .domain([d3.min(ys, function(y){ return d3.min(y); }) - 0.01,
                 d3.max(ys, function(y){ return d3.max(y); }) + 0.01])
        .range([h+margin.top, margin.top]);

    // Add an SVG element with the desired dimensions and margin.
    var svg = d3.select(selector).append("svg")
        .attr("viewBox","0 0 "+graph_w+" "+graph_h)
        .attr("width","100%")
        .attr("height","100%");

    // create the axes
    var xAxis = d3.svg.axis()
        .scale(scale_x)
        .orient("bottom")
        .ticks(9);
    svg.append("g")
        .attr("class", "axis axis_x unselectable")
        .attr("transform", "translate(0," + (h+margin.top)  + ")")
        .call(xAxis);

    var yAxisLeft = d3.svg.axis()
        .scale(scale_y)
        .ticks(5)
        .orient("left");
    var yAxisRight = d3.svg.axis()
        .scale(scale_x)
        .scale(scale_y)
        .ticks(5)
        .orient("right");
    svg.append("g")
        .attr("class", "axis axis_y unselectable")
        .attr("transform", "translate(" + margin.left + ",0)")
        .call(yAxisLeft);
    svg.append("g")
        .attr("class", "axis axis_y unselectable")
        .attr("transform", "translate(" + w + ",0)")
        .call(yAxisRight);

    // label the axes
    if (x_label !== "") {
        svg.append("text")
            .attr("class", "x label")
            .attr("text-anchor", "middle")
            .attr("x", graph_w / 2)
            .attr("y", text_offset + graph_h - margin.bottom / 2)
            .text(x_label);
    }

    if (y_label !== "") {
        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "middle")
            .attr("x", -graph_h/2)
            .attr("y", -text_offset + margin.left / 2)
            .attr("dy", ".75em")
            .attr("transform", "rotate(-90)")
            .text(y_label);
    }

    // add the lines
    var colors = Nengo.make_colors(ys.length);

    var line = d3.svg.line()
        .x(function(d, i) { return scale_x(x[i]); })
        .y(function(d) { return scale_y(d); })

    svg.append("g")
        .selectAll("path")
        .data(ys)
      .enter()
        .append("path")
        .attr("d", line)
        .attr("class", "line")
        .style("stroke", function(d, i) { return colors[i]; });
}

Nengo.VPLConfig.prototype.ensemble_config = function(uid){
    var vpl = Nengo.vpl;
    var editor = ace.edit("editor");
    var re = new RegExp("(?:[^\.])"+uid+"\\s*=");
    var code_line = editor.find(re);
    var component = Nengo.netgraph.svg_objects[uid];
    Nengo.modal.component_config(uid);
    Nengo.modal.show();
    Nengo.modal.footer('ok_cancel',
        function(e) {
            var n_number = $("#config-neuron-number").val();
            var dim_number = $("#config-dimension").val();
            var Range = require("ace/range").Range;
            var tab = "    ";
            var tabs;
            Nengo.netgraph.svg_objects[uid].n_neurons = n_number;
            Nengo.netgraph.svg_objects[uid].dimensions = dim_number;

            if(component.parent == null){tabs = tab;}
            else{tabs = tab+tab;}

            editor.session.replace(new Range(code_line.start.row, 0, code_line.start.row, Number.MAX_VALUE),
            tabs+uid+" = nengo.Ensemble(n_neurons="+n_number+",dimensions="+dim_number+")");
            vpl.delete_connections(uid);
            var conn_in = component.conn_in;
            var conn_out = component.conn_out;
            for(var x = 0; x < conn_in.length; x++){
                vpl.add_connection(conn_in[x].pre.uid,conn_in[x].post.uid);
            }
            for(var x = 0; x < conn_out.length; x++){
                vpl.add_connection(conn_out[x].pre.uid,conn_out[x].post.uid);
            }
            $('#OK').attr('data-dismiss', 'modal');
        },
        function () {
            $('#cancel-button').attr('data-dismiss', 'modal');
        }
    );
}

$(document).ready(function(){
  Nengo.vpl_config = new Nengo.VPLConfig();
});
