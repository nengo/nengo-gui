Nengo.Modal = function($div) {
    var self = this;
    this.$div = $div;
    this.$title = this.$div.find('.modal-title').first();
    this.$footer = this.$div.find('.modal-footer').first();
    this.$body = this.$div.find('.modal-body').first();

    this.sim_was_running = false;

    this.$div.on('hidden.bs.modal', function () {
        if (self.sim_was_running) {
            sim.play();
        }
    })
}

Nengo.Modal.prototype.show = function() {
    this.sim_was_running = !sim.paused;
    this.$div.modal('show');
    sim.pause()
}

Nengo.Modal.prototype.title = function(title) {
    this.$title.text(title);
}

Nengo.Modal.prototype.footer = function(type, ok_function, cancel_function){
    this.$footer.empty();

    if (type === "close") {
        this.$footer.append('<button type="button" class="btn btn-default"' +
            ' data-dismiss="modal">Close</button>');
    } else if (type === "ok_cancel") {
        var $footerBtn = $('<div class="form-group"/>').appendTo(this.$footer);
        $footerBtn.append('<button id="cancel-button" type="button" ' +
            'class="btn btn-default">Cancel</button>');
        $footerBtn.append('<button id="OK" type="submit" ' +
            'class="btn btn-primary" >OK</button>');
        $('#OK').on('click', ok_function);
        if (typeof cancel_function !== 'undefined') {
            $('#cancel-button').on('click', cancel_function);
        } else {
            $('#cancel-button').on('click', function () {
                $('#cancel-button').attr('data-dismiss', 'modal');
            });
        }
    } else if (type === 'confirm_reset') {
        this.$footer.append('<button type="button" ' +
            'id="confirm_reset_button" class="btn btn-primary">Reset</button>');
        this.$footer.append('<button type="button" ' +
            'class="btn btn-default" data-dismiss="modal">Close</button>');
        $('#confirm_reset_button').on('click', function() {
            toolbar.reset_model_layout();
        });
    } else {
        console.warn('Modal footer type ' + type + ' not recognized.')
    }
}

Nengo.Modal.prototype.clear_body = function() {
    this.$body.empty();
    this.$div.find('.modal-dialog').removeClass('modal-sm');
    this.$div.off('shown.bs.modal');
}

Nengo.Modal.prototype.text_body = function(text, type) {
    if (typeof type === 'undefined') { type = "info"; }

    this.clear_body();
    var $alert = $('<div class="alert alert-' + type + '" role="alert"/>')
        .appendTo(this.$body);
    var $p = $('<p/>').appendTo($alert);
    $p.append('<span class="glyphicon glyphicon-exclamation-sign"' +
        ' aria-hidden="true"></span>');
    $p.append(document.createTextNode(text));
}

Nengo.Modal.prototype.help_body = function() {
    this.clear_body();

    this.$div.find('.modal-dialog').addClass('modal-sm');
    var $body = $('<table class="table-striped" width=100%>');
    $body.append('<tr><td>Play / pause</td>' +
                 '<td align="right">Spacebar</td></tr>');
    $body.append('<tr><td>Undo</td>' +
                 '<td align="right">Ctrl-z</td></tr>');
    $body.append('<tr><td>Redo</td>'+
                 '<td align="right">Ctrl-Shift-z, Ctrl-y</td></tr>');
    $body.append('<tr><td>Toggle minimap</td>'+
                 '<td align="right">Ctrl-m</td></tr>');
    $body.append('<tr><td>Toggle editor</td>'+
                 '<td align="right">Ctrl-e</td></tr>');
    $body.append('<tr><td>Show hotkeys</td>'+
                 '<td align="right">?</td></tr>');
    $body.append('</table>');
    $body.appendTo(this.$body);
}


/**
 * Sets up the tabs for Info modals.
 */
Nengo.Modal.prototype.tabbed_body = function(tabinfo) {
    this.clear_body();
    var tabdivs = {}
    var $tab_ul = $('<ul class="nav nav-tabs"/>').appendTo(this.$body);
    var $content = $('<div class="tab-content"/>').appendTo(this.$body);

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
 * Sets up the body for main configuration
 */
Nengo.Modal.prototype.main_config = function(options) {
    this.clear_body();

    var $form = $('<form class="form-horizontal" id ' +
        '="myModalForm"/>').appendTo(this.$body);
    $('<div class="form-group" id="config-fontsize-group">' +
        '<label for="config-fontsize" class="control-label">' +
            'Font size</label>' +
        '<div class="input-group col-xs-2">' +
          '<input type="number" min="20" max="999" step="1" ' +
            'maxlength="3" class="form-control" id="config-fontsize"' +
                ' data-error="Twenty to 999 percent of the base size"' +
                ' required>' +
          '<span class="input-group-addon">%</span>' +
        '</div>' +
        '<span class="help-block with-errors">As a percentage of' +
            ' the base size</span>' +
    '</div>' +
    '<div class="form-group">' +
        '<div class="checkbox">' +
          '<label for="zoom-fonts" class="control-label">' +
            '<input type="checkbox" id="zoom-fonts">' +
            'Allow fonts to zoom' +
          '</label>' +
          '<div class="help-block with-errors"></div>' +
        '</div>' +
    '</div>' +
    '<div class="form-group">' +
        '<div class="select">' +
            '<label for="config-backend" class="control-label">' +
                'Select backend' +
            '</label>' +
            '<select class="form-control" id="config-backend">' +
                sim.simulator_options +
            '</select>' +
        '</div>' +
    '</div>').appendTo($form);

    this.$div.on('shown.bs.modal', function () {
        $('#config-fontsize').focus();
    });
    $('#zoom-fonts').prop('checked', options[0]);
    $('#zoom-fonts').change(function () {
        Nengo.netgraph.set_zoom_fonts($('#zoom-fonts').prop('checked'));
    });

    $('#config-fontsize').val(options[1]);
    $('#config-fontsize').bind('keyup input', function () {
        Nengo.netgraph.set_font_size(parseInt($('#config-fontsize').val()));
    });

    $('#config-fontsize').attr('data-my_validator', 'custom');

    $('#config-backend').change(function () {
        console.log($('#config-backend').val());
        sim.set_backend($('#config-backend').val());
    });

    //Allow the enter key to submit
    $("#config-fontsize").keypress(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            $('#OK').click();
        }
    });}

/**
 * Sets up the body for standard input forms
 */
Nengo.Modal.prototype.single_input_body = function(start_values, label) {
    this.clear_body();

    var $form = $('<form class="form-horizontal" id ="myModalForm"/>').appendTo(this.$body);
    var $ctrlg = $('<div class="form-group"/>').appendTo($form);
    $ctrlg.append('<label class="control-label" for="singleInput">' + label +
                  '</label>');
    var $ctrls = $('<div class="controls"/>').appendTo($ctrlg);
    $ctrls.append('<input id="singleInput" type="text" placeholder="' +
                  start_values + '"/>');
    $('<div class="help-block with-errors"/>').appendTo($ctrls);
    this.$div.on('shown.bs.modal', function () {
        $('#singleInput').focus();
    });

    //Add custom validator
    $('#singleInput').attr('data-my_validator', 'custom');

    //Allow the enter key to submit
    $("#singleInput").keypress(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            $('#OK').click();
        }
    });
}

Nengo.Modal.prototype.ensemble_body = function(uid, params, plots, conninfo) {
    var tabs = this.tabbed_body([{id: 'params', title: 'Parameters'},
                                 {id: 'plots', title: 'Plots'},
                                 {id: 'connections', title: 'Connections'}]);
    this.render_params(tabs.params, params, Nengo.tooltips.ens);
    this.render_plots(tabs.plots, plots);
    this.render_connections(tabs.connections, uid, conninfo);
}

Nengo.Modal.prototype.node_body = function(uid, params, plots, conninfo) {
    var tabs = this.tabbed_body([{id: 'params', title: 'Parameters'},
                                 {id: 'plots', title: 'Plots'},
                                 {id: 'connections', title: 'Connections'}]);
    this.render_params(tabs.params, params, Nengo.tooltips.node);
    this.render_plots(tabs.plots, plots);
    this.render_connections(tabs.connections, uid, conninfo);
}

Nengo.Modal.prototype.net_body = function(uid, stats, conninfo) {
    var tabs = this.tabbed_body([{id: 'stats', title: 'Statistics'},
                                 {id: 'connections', title: 'Connections'}]);
    this.render_stats(tabs.stats, stats);
    this.render_connections(tabs.connections, uid, conninfo);
}

/**
 * Renders information about the parameters of an object.
 */
Nengo.Modal.prototype.render_params = function($parent, params, tooltips) {
    var $plist = $('<dl class="dl-horizontal"/>').appendTo($parent);
    for (var i = 0; i < params.length; i++) {
        var $dt = $('<dt/>').appendTo($plist);
        $dt.text(params[i][0]);

        var $dd = $('<dd/>').appendTo($plist);
        $dd.text(params[i][1]);
        Nengo.tooltips.popover($dt,
                             tooltips[String(params[i][0])][0],
                             tooltips[String(params[i][0])][1]);
    }
}

/**
 * Renders information about some statistics of an object.
 */
Nengo.Modal.prototype.render_stats = function($parent, stats) {
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
Nengo.Modal.prototype.render_plots = function($parent, plots) {
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
            this.render_plot($parent, plots[i]);
        }
    }
}

/**
 * Renders information about a single plot.
 */
Nengo.Modal.prototype.render_plot = function($parent, plotinfo) {
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
        this.multiline_plot($parent.get(0), plotinfo.x, plotinfo.y);
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
Nengo.Modal.prototype.multiline_plot = function(selector, x, ys) {
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

    var colors = Nengo.make_colors(ys.length);

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
Nengo.Modal.prototype.render_connections = function($parent, uid, conninfo) {
    var ngi = Nengo.netgraph.svg_objects[uid];
    var conn_in_objs = ngi.conn_in;
    if (conn_in_objs.length > 0) {
        $parent.append('<h3>Incoming Connections</h3>');

        var $conn_in_table = $('<table class="table table-condensed"><tr>' +
                               '<th class="conn-objs">Object</th>' +
                               '<th class="conn-funcs">Function</th>' +
                               '<th class="conn-fan">Fan In</th></tr>')
            .appendTo($parent);
        Nengo.tooltips.popover($conn_in_table.find('.conn-objs').first(),
                             "'Pre' object",
                             "This object plays the role of 'Pre' in the " +
                             "connection to this object.",
                             "top");
        Nengo.tooltips.popover($conn_in_table.find('.conn-funcs').first(),
                             "Connection function",
                             "The function being computed across this " +
                             "connection (in vector space).",
                             "top");
        Nengo.tooltips.popover($conn_in_table.find('.conn-fan').first(),
                             "Neuron fan-in",
                             "The number of incoming neural connections. " +
                             "In biological terms, this is the maximum number" +
                             " of " +
                             "synapses in the dendritic tree of a single " +
                             "neuron in this object, resulting from this " +
                             "connection. The total number of synapses would " +
                             "be the sum of the non-zero numbers in this " +
                             "column.",
                             "top");

        this.make_connections_table_row(
            $conn_in_table, conninfo, conn_in_objs,
            function (conn_obj) { return conn_obj.pre },
            function (conn_obj) { return conn_obj.pres });
    }

    var conn_out_objs = ngi.conn_out;
    if (conn_out_objs.length > 0) {
        if (conn_in_objs.length > 0) {
            $parent.append('<hr/>');
        }
        $parent.append('<h3>Outgoing Connections</h3>');

        var $conn_out_table = $('<table class="table table-condensed"><tr>' +
                                '<th class="conn-objs">Object</th>' +
                                '<th class="conn-funcs">Function</th>' +
                                '<th class="conn-fan">Fan Out</th></tr>')
            .appendTo($parent);

        Nengo.tooltips.popover($conn_out_table.find('.conn-objs').first(),
                             "'Post' object",
                             "This object plays the role of 'Post' in the " +
                             "connection from this object.",
                             "top");
        Nengo.tooltips.popover($conn_out_table.find('.conn-funcs').first(),
                             "Connection function",
                             "The function being computed across this " +
                             "connection (in vector space).",
                             "top");
        Nengo.tooltips.popover($conn_out_table.find('.conn-fan').first(),
                             "Neuron fan-out",
                             "The number of outgoing neural connections. " +
                             "In biological terms, this is the maximum number" +
                             " of " +
                             "synapses from axon terminals of a single " +
                             "neuron in this object, resulting from this " +
                             "connection. The total number of synapses would " +
                             "be the sum of the non-zero numbers in this " +
                             "column.",
                             "top");

        this.make_connections_table_row(
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
        }
    }
}

/*
 *  Generates one row in the connections table in the connections tab.
 */
Nengo.Modal.prototype.make_connections_table_row = function($table, conninfo, conn_objs, get_conn_other, get_conn_conn_uid_list) {
    for (var i = 0; i < conn_objs.length; i++) {
        // Get a reference to the object that the current object is connected to
        var conn_other = get_conn_other(conn_objs[i]);

        // Make a row in the table
        var $tr = $('<tr/>').appendTo($table);

        // Make the objects column
        var $objs_td = $('<td>' + String(conn_other.label.innerHTML) +
                         '</td>').appendTo($tr);
        this.make_conn_path_dropdown_list(
            $objs_td,
            conn_other.uid,
            conninfo["obj_type"][String(conn_objs[i].uid)],
            get_conn_conn_uid_list(conn_objs[i]));

        // Make the functions column
        var $func_td = $('<td/>').appendTo($tr);
        $func_td.text(conninfo["func"][String(conn_objs[i].uid)]);

        // Make the fan data column
        var $fan_td = $('<td>' + conninfo["fan"][String(conn_objs[i].uid)] + '</td>').appendTo($tr);
        if (conninfo["obj_type"][String(conn_objs[i].uid)] === "passthrough") {
            Nengo.tooltips.tooltip($fan_td, Nengo.tooltips.conn.fan_passthrough);
        }
    }
}

/*
 *  Generates the connection path dropdown list for the connections tab.
 */
Nengo.Modal.prototype.make_conn_path_dropdown_list = function($container, others_uid, obj_type, conn_uid_list) {
    if (conn_uid_list.length > 1) {
        // Add expand control and the tooltip to the <dd> object
        var $lg_header = $('<a data-toggle="collapse" href="#pathlist' +
                           String(conn_uid_list[0]).replace(/[\.\[\]]/g, '_') +
                           '" aria-expanded="false"/>').appendTo($container);

        // Make the "expand down" tooltip
        Nengo.tooltips.tooltip($lg_header, Nengo.tooltips.conn.expand,
                             "right", "glyphicon-collapse-down");

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
            if (conn_uid_list[p] in Nengo.netgraph.svg_objects){
                // If the uid is in netgraph.svg_objects, use the object's label
                var path_item = Nengo.netgraph.svg_objects[conn_uid_list[p]].label.innerHTML;
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

Nengo.modal = new Nengo.Modal($('.modal').first());

//Change the global defaults of the modal validator
$( document ).ready(function() {
    $validator = $.fn.validator.Constructor.DEFAULTS;
    //Change the delay before showing errors
    $validator["delay"] = 5000;
    //Leave the ok button on
    $validator["disable"] = false;
    //Set the error messages for new validators
    $validator["errors"] = {my_validator: 'Does not match'};
});
