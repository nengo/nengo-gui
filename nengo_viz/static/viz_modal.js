VIZ.Modal = {};

VIZ.Modal.show = function() {
    this.sim_was_running = !sim.paused;
    $('.modal').first().modal('show');
    sim.pause()
}

$('.modal').first().on('hidden.bs.modal', function () {
    if (VIZ.Modal.sim_was_running) {
        sim.play();
    }
})

VIZ.Modal.title = function(title) {
    $('.modal-title').first().text(title);
}

VIZ.Modal.footer = function(type){
    var $footer = $('.modal-footer').first();
    $footer.empty();

    if (type === "close") {
        $footer.append('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>');
    } else {
        console.warn('Modal footer type ' + type + ' no recognized.')
    }
}

VIZ.Modal.ensemble_body = function(uid, params, plots, conninfo) {
    var tabs = info_body([{id: 'params', title: 'Parameters'},
                          {id: 'plots', title: 'Plots'},
                          {id: 'connections', title: 'Connections'}]);
    render_params(tabs.params, params, VIZ.tooltips.ens);
    render_plots(tabs.plots, plots);
    render_connections(tabs.connections, uid, conninfo);
}

VIZ.Modal.node_body = function(uid, params, plots, conninfo) {
    var tabs = info_body([{id: 'params', title: 'Parameters'},
                          {id: 'plots', title: 'Plots'},
                          {id: 'connections', title: 'Connections'}]);
    render_params(tabs.params, params, VIZ.tooltips.node);
    render_plots(tabs.plots, plots);
    render_connections(tabs.connections, uid, conninfo);
}

VIZ.Modal.net_body = function(uid, stats, conninfo) {
    var tabs = info_body([{id: 'stats', title: 'Statistics'},
                          {id: 'connections', title: 'Connections'}]);
    render_stats(tabs.stats, stats);
    render_connections(tabs.connections, uid, conninfo);
}

/**
 * Sets up the tabs for Info modals.
 */
function info_body(tabinfo) {
    var tabdivs = {}
    var $body = $('.modal-body').first();
    $body.empty();

    var $tab_ul = $('<ul class="nav nav-tabs"/>').appendTo($body);
    var $content = $('<div class="tab-content"/>').appendTo($body);

    for (var i = 0; i < tabinfo.length; i++) {
        // <li> for the tab label
        var $tab_li = $('<li/>').appendTo($tab_ul);
        $tab_li.append('<a href="#' + tabinfo[i].id + '" data-toggle="tab">' +
                       tabinfo[i].title + '</a>');

        // <div> for the tab content
        tabdivs[tabinfo[i].id] = $(
            '<div class="tab-pane" id="' + tabinfo[i].id + '"/>')
            .appendTo($content);
        if (i === 0) {
            $tab_li.addClass("active");
            tabdivs[tabinfo[i].id].addClass("active");
        }
    }
    return tabdivs;
}

/**
 * Renders information about the parameters of an object.
 */
function render_params($parent, params, tooltips) {
    var $plist = $('<dl class="dl-horizontal"/>').appendTo($parent);
    for (var i = 0; i < params.length; i++) {
        var $dt = $('<dt/>').appendTo($plist);
        $dt.text(params[i][0]);

        var $dd = $('<dd/>').appendTo($plist);
        $dd.text(params[i][1]);

        var $tooltip = $('<a href="#" data-toggle="popover" ' +
                         'data-placement="right" ' +
                         'title="' + tooltips[String(params[i][0])][0] + '"' +
                         'data-content="' + tooltips[String(params[i][0])][1] +
                         '"/>');
        $tooltip.append('<span class="glyphicon glyphicon-question-sign" ' +
                        'aria-hidden="true"/>').appendTo($dt);
        $tooltip.popover({"trigger": "hover"});
    }
}

/**
 * Renders information about some statistics of an object.
 */
function render_stats($parent, stats) {
    for (var i = 0; i < stats.length; i++) {
        $parent.append('<h3>' + stats[i].title + '</h3>')
        var $stable = $('<table class="table table-condensed table-hover"/>')
            .appendTo($parent);

        for (var j = 0; j < stats[i].stats.length; j++) {
            var $tr = $('<tr/>').appendTo($stable);
            var $desc = $('<td class="col-md-8"/>').appendTo($tr);
            $desc.text(stats[i].stats[j][0]);
            var $val = $('<td class="col-md-4"/>').appendTo($tr);
            $val.text(stats[i].stats[j][1]);
        }
    }
}

/**
 * Renders information about plots related to an object.
 */
function render_plots($parent, plots) {
    // This indicates an error (usually no sim running)
    if (typeof plots === 'string') {
        var $err = $('<div class="alert alert-danger" role="alert"/>')
            .appendTo($parent);
        $err.append('<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>');
        $err.append('<span class="sr-only">Error:</span>');
        $err.append(document.createTextNode(plots));
    }
    else {
        for (var i=0; i < plots.length; i++) {
            render_plot($parent, plots[i]);
        }
    }
}

/**
 * Renders information about a single plot.
 */
function render_plot($parent, plotinfo) {
    $parent.append("<h4>" + plotinfo.title + "</h4>")

    if (plotinfo.warnings.length > 0) {
        var $warn = $('<div class="alert alert-warning" role="alert"/>')
            .appendTo($parent);

        for (var i = 0; i < plotinfo.warnings.length; i++) {
            var $p = $('<p/>').appendTo($warn);
            $p.append('<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>');
            $p.append('<span class="sr-only">Warning:</span>');
            $p.append(document.createTextNode(plotinfo.warnings[i]));
        }
    }

    if (plotinfo.plot === 'multiline') {
        multiline_plot($parent.get(0), plotinfo.x, plotinfo.y);
    } else if (plotinfo.plot !== 'none') {
        console.warn("Plot type " + plotinfo.plot +
                     " not understood, or not implemented yet.");
    }
}

/**
 * Static multiline plot with shared x-axis
 *
 * @param {String} selector - Where the svg will be added
 * @param {Array of Float} x - The shared x-axis
 * @param {Array of Array of Float} ys - The y data for each line
 */
function multiline_plot(selector, x, ys) {
    var m = {left: 50, top: 10, right: 0, bottom: 30};
    var w = 500 - m.left - m.right;
    var h = 220 - m.bottom - m.top;

    var scale_x = d3.scale.linear()
        .domain([x[0], x[x.length-1]])
        .range([m.left, w - m.right]);
    var scale_y = d3.scale.linear()
        .domain([d3.min(ys, function(y){ return d3.min(y); }) - 0.01,
                 d3.max(ys, function(y){ return d3.max(y); }) + 0.01])
        .range([h+m.top, m.top]);

    // Add an SVG element with the desired dimensions and margin.
    var graph = d3.select(selector).append("svg")
        .attr("width", w + m.left + m.right)
        .attr("height", h + m.bottom + m.top);

    var xAxis = d3.svg.axis()
        .scale(scale_x)
        .orient("bottom")
        .ticks(9);
    graph.append("g")
        .attr("class", "axis axis_x unselectable")
        .attr("transform", "translate(0," + (h+m.top)  + ")")
        .call(xAxis);

    var yAxisLeft = d3.svg.axis()
        .scale(scale_y)
        .ticks(5)
        .orient("left");
    graph.append("g")
        .attr("class", "axis axis_y unselectable")
        .attr("transform", "translate(" + m.left + ",0)")
        .call(yAxisLeft);

    var colors = VIZ.make_colors(ys.length);

    var line = d3.svg.line()
        .x(function(d, i) { return scale_x(x[i]); })
        .y(function(d) { return scale_y(d); })

    graph.append("g")
        .selectAll("path")
        .data(ys)
      .enter()
        .append("path")
        .attr("d", line)
        .attr("class", "line")
        .style("stroke", function(d, i) { return colors[i]; });
}

/*
 *  Renders information about connections related to an object.
 */
function render_connections($parent, uid, conninfo) {
    var ngi = VIZ.netgraph.svg_objects[uid];
    var conn_in_objs = ngi.conn_in;
    if (conn_in_objs.length > 0) {
        $parent.append('<h3>Incoming Connections</h3>');

        var $conn_in_table = $('<table class="table table-condensed"><tr>' +
                               '<th class="conn-objs">Object</th>' +
                               '<th class="conn-funcs">Function</th>' +
                               '<th class="conn-fan">Fan In</th></tr>').appendTo($parent);

        make_connections_table_row($conn_in_table, conninfo, conn_in_objs,
                                   function (conn_obj) { return conn_obj.pre },
                                   function (conn_obj) { return conn_obj.pres });

        VIZ.tooltips.popover($conn_out_table.find('.conn-objs').first(),
                             "'Post' object",
                             "This object plays the role of 'Post' in the " +
                             "connection from this object.",
                             "top");
        VIZ.tooltips.popover($conn_out_table.find('.conn-funcs').first(),
                             "Connection function",
                             "This function being computed across this " +
                             "connection (in vector space).",
                             "top");
        VIZ.tooltips.popover($conn_out_table.find('.conn-fan').first(),
                             "Neuron fan-out",
                             "The number of outgoing neural connections. " +
                             "In biological terms, this is the number of " +
                             "synapses from axon terminals of a single " +
                             "neuron in this object, resulting from this " +
                             "connection. The total number of synapses would " +
                             "be the sum of the numbers in this column.",
                             "top");

        VIZ.Modal.make_connections_table_row(
            $conn_out_table, conninfo, conn_out_objs,
            function (conn_obj) { return conn_obj.post },
            function (conn_obj) { return conn_obj.posts });
    }

    if (conn_in_objs.length === 0 && conn_out_objs.length === 0) {
        var $warn = $('<div class="alert alert-warning" role="alert"/>')
            .appendTo($parent);
        var $p = $('<p/>').appendTo($warn);
        $p.append('<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>');
        $p.append('<span class="sr-only">Warning:</span>');
        if (ngi.type === 'net' && ngi.expanded) {
            $p.append(document.createTextNode(
                "Network is expanded. Please see individual objects for connection info."));
        } else {
            $p.append(document.createTextNode("No connections to or from this object."));
        make_connections_table_row($conn_out_table, conninfo, conn_out_objs,
                                   function (conn_obj) { return conn_obj.post },
                                   function (conn_obj) { return conn_obj.posts });
    }

    if (conn_in_objs.length === 0 && conn_out_objs.length === 0) {
        var $warn = $('<div class="alert alert-warning" role="alert"/>')
            .appendTo($parent);
        var $p = $('<p/>').appendTo($warn);
        $p.append('<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>');
        $p.append('<span class="sr-only">Warning:</span>');
        if (ngi.type === 'net' && ngi.expanded) {
            $p.append(document.createTextNode(
                "Network is expanded. Please see individual objects for connection info."));
        } else {
            $p.append(document.createTextNode("No connections to or from this object."));
        }
    }
}

/*
 *  Generates one row in the connections table in the connections tab.
 */
function make_connections_table_row($table, conninfo, conn_objs, get_conn_other, get_conn_conn_uid_list) {
    for (var i = 0; i < conn_objs.length; i++) {
        // Get a reference to the object that the current object is connected to
        var conn_other = get_conn_other(conn_objs[i]);

        // Make a row in the table
        var $tr = $('<tr/>').appendTo($table);

        // Make the objects column
        var $objs_td = $('<td>' + String(conn_other.label.innerHTML) +
                         '</td>').appendTo($tr);
        make_conn_path_dropdown_list($objs_td,
                                     conn_other.uid,
                                     conninfo["obj_type"][String(conn_objs[i].uid)],
                                     get_conn_conn_uid_list(conn_objs[i]));

        // Make the functions column
        var $func_td = $('<td/>').appendTo($tr);
        $func_td.text(conninfo["func"][String(conn_objs[i].uid)]);

        // Make the fan data column
        var $fan_td = $('<td>' + conninfo["fan"][String(conn_objs[i].uid)] + '</td>').appendTo($tr);
        if (conninfo["obj_type"][String(conn_objs[i].uid)] === "passthrough") {
            var $fan_tooltip = $('<a href="#" data-toggle="tooltip" data-placement="bottom"' +
                                 'title="' + VIZ.tooltips.conn.fan_passthrough + '">' +
                                 '<span class="glyphicon glyphicon-question-sign"/></a>');
            $fan_tooltip.tooltip();

            $fan_td.append($fan_tooltip);
>>>>>>> Updated connections info tab
        }
    }
}

/*
 *  Generates the connection path dropdown list for the connections tab.
 */
function make_conn_path_dropdown_list($container, others_uid, obj_type, conn_uid_list) {
    if (conn_uid_list.length > 1) {
        // Make the "expand down" tooltip
        var $exp_tooltip = $('<a href="#" data-toggle="tooltip" data-placement="right"' +
                             'title="' + VIZ.tooltips.conn.expand + '">' +
                             '<span class="glyphicon glyphicon-collapse-down"/></a>');
        $exp_tooltip.tooltip();

/*
 *  Generates the connection path dropdown list for the connections tab.
 */
VIZ.Modal.make_conn_path_dropdown_list = function($container, others_uid, obj_type, conn_uid_list) {
    if (conn_uid_list.length > 1) {
        // Add expand control and the tooltip to the <dd> object
        $container.append($('<a data-toggle="collapse" href="#pathlist' +
                          String(conn_uid_list[0]).replace(/[\.\[\]]/g, '_') +
                          '" aria-expanded="false"/>').append($exp_tooltip));

        // Make a list-group for the drop down items
        var $path_list = $('<ul class="list-group">')
                            .appendTo($('<div class="collapse" id="pathlist' +
                                      String(conn_uid_list[0]).replace(/[\.\[\]]/g, '_') +
                                      '"/>')
                                .appendTo($container));

        // Add the root "Model" item to the drop down list
        $path_list.append('<li class="list-group-item shaded"><span class="glyphicon glyphicon-home"/>Model</a>')

        // Populate the list-group
        var shaded_option = "shaded";
        var endpoint_icon = "glyphicon glyphicon-triangle-right";
        for (var p = conn_uid_list.length - 1; p >= 0; p--) {
            if (conn_uid_list[p] in VIZ.netgraph.svg_objects){
                // If the uid is in netgraph.svg_objects, use the object's label
                var path_item = VIZ.netgraph.svg_objects[conn_uid_list[p]].label.innerHTML;
            }
            else {
                // Otherwise, use the object's uid (with brackets to indicate that the UI
                // is unsure of the exact label)
                var path_item = '(' + String(conn_uid_list[p]) + ')';
            }

            if (others_uid === conn_uid_list[p]) {
                // Toggle the shading option when the others_uid has been reached
                shaded_option = '';
            }

            if (p === 0) {
                switch (obj_type) {
                    case "ens":
                        endpoint_icon = "glyphicon glyphicon-option-horizontal";
                        break;
                    case "node":
                        endpoint_icon = "glyphicon glyphicon-stop";
                        break;
                    case "passthrough":
                        endpoint_icon = "glyphicon glyphicon-share-alt";
                        break;
                    case "net":
                        endpoint_icon = "glyphicon glyphicon-list-alt";
                        break;
                    default:
                        endpoint_icon = "glyphicon glyphicon-warning-sign";
                        break;
                }
            }

            $path_list.append('<li class="list-group-item ' + shaded_option +
                              '"><span class="' + endpoint_icon + '"/>' +
                              path_item + '</li>');
        }
    }
}
