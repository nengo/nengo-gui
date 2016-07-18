/**
 * Namespace for all Nengo visualization.
 *
 * Root functions contain miscelaneous utility functions
 */

// Expose jquery globally
var $ = require('expose?$!./jquery');

require('./nengo.css');
var d3 = require('d3');

var Nengo = {};

Nengo.user_settings = [];

Nengo.max_zindex = 0;

/**
 * Helper function to clip a number, keeping it between two values.
 */
Nengo.clip = function(x, low, high) {
    if (x < low) {
        x = low;
    }
    if (x > high) {
        x = high;
    }
    return x;
};

/**
 * Helper function to set the transform of an element.
 */
Nengo.set_transform = function(element, x, y) {
    element.style.webkitTransform =
        element.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
};

/**
 * Create a WebSocket connection to the given id.
 */
Nengo.create_websocket = function(uid) {
    var parser = document.createElement('a');
    parser.href = document.URL;
    if (window.location.protocol === 'https:') {
        var ws_proto = 'wss:';
    } else {
        var ws_proto = 'ws:';
    }
    var ws_url = ws_proto + '//' + parser.host + '/viz_component?uid=' + uid;
    var ws = new WebSocket(ws_url);
    ws.binaryType = "arraybuffer";
    return ws;
};

/**
 * Generate a color sequence of a given length.
 *
 * Colors are defined using a color blind-friendly palette.
 */
Nengo.make_colors = function(N) {
    // Color blind palette with blue, green, red, magenta, yellow, cyan
    var palette =
        ["#1c73b3", "#039f74", "#d65e00", "#cd79a7", "#f0e542", "#56b4ea"];
    var c = [];

    for (var i = 0; i < N; i++) {
        c.push(palette[i % palette.length]);
    }
    return c;
};

/**
 * Check if a string value represents a number.
 */
Nengo.is_num = function(value) {
    if ( !(isNaN(value)) && !(value.trim() === '') ) {
        return true;
    } else {
        return false;
    }
};

Nengo.next_zindex = function() {
    Nengo.max_zindex++;
    return Nengo.max_zindex;
};

/**
 * Draw a legend.
 */
Nengo.draw_legend = function(parent, labels, color_func, uid) {
    // "20" is around the size of the font
    legend_svg = d3.select(parent)
                       .append("svg")
                       .attr("width", 150)
                       .attr("height", 20 * labels.length)
                       .attr("id", "legend" + uid);

    if (labels.length === 0) {
        return legend_svg;
    }

    legend_svg.selectAll('rect')
        .data(labels)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", function(d, i) {
            return i * 20;
        }).attr("class", "legend-label")
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", color_func);

    legend_svg.selectAll('text')
        .data(labels)
        .enter()
        .append("text")
        .attr("x", 15)
        .attr("y", function(d, i) {
            return i * 20 + 9;
        }).attr("class", "legend-label")
        .html(function(d, i) {
            return labels[i];
        });

    // Expand the width of the svg to the length of the longest string
    var label_list = $("#legend" + uid + " .legend-label").toArray();
    var longest_label = Math.max.apply(Math, label_list.map(function(o) {
        return o.getBBox().width;
    }));
    // "50" is for the similarity measure that is around three characters wide
    var svg_right_edge = longest_label + 50;
    legend_svg.attr("width", svg_right_edge);

    return legend_svg;
};

module.exports = Nengo; // Have to do this first due to circular dependency

// Require all of the files that make up the Nengo JS app

require('./favicon.ico');
require('bootstrap/dist/css/bootstrap.min.css');
require('jqueryfiletree/dist/jQueryFileTree.min.css');
require('brace');
require('brace/mode/python');

require('imports?Nengo=./nengo!./config');
// Exposing data_to_csv for testing
require('expose?data_to_csv!imports?Nengo=./nengo!./data_to_csv');
require('imports?Nengo=./nengo!./datastore');
require('./editor.css');
require('imports?Nengo=./nengo,ace=brace,interact=interact.js!./editor');
require('imports?Nengo=./nengo!./hotkeys');
require('./menu.css');
require('imports?Nengo=./nengo!./menu');
require('./modal.css');
require('imports?Nengo=./nengo,d3!./modal');
require('./side_menu.css');
require('imports?Nengo=./nengo!./side_menu');
require('./sim_control.css');
require('imports?Nengo=./nengo,d3,interact=interact.js!./sim_control');
require('./tooltips.css');
require('imports?Nengo=./nengo!./tooltips');
require('./top_toolbar.css');
require('imports?Nengo=./nengo,interact=interact.js!./top_toolbar');
require('imports?Nengo=./nengo!./viewport');
require('imports?Nengo=../nengo,interact=interact.js!./components/component');
require('./components/value.css');
require('imports?Nengo=../nengo,d3!./components/value');
require('imports?Nengo=../nengo,d3!./components/2d_axes');
require('imports?Nengo=../nengo!./components/htmlview');
require('imports?Nengo=../nengo,d3!./components/image');
require('./components/netgraph.css');
require('imports?Nengo=../nengo,interact=interact.js!./components/netgraph');
require('imports?Nengo=../nengo!./components/netgraph_conn');
require('imports?Nengo=../nengo,interact=interact.js!' +
        './components/netgraph_item');
require('./components/pointer.css');
require('imports?Nengo=../nengo!./components/pointer');
require('./components/raster.css');
require('imports?Nengo=../nengo,d3!./components/raster');
require('./components/slider.css');
require('imports?Nengo=../nengo!./components/slider');
require('imports?Nengo=../nengo,d3,interact=interact.js!' +
        './components/slidercontrol');
require('./components/spa_similarity.css');
// Must go after value
require('imports?Nengo=../nengo,d3!./components/spa_similarity');
require('imports?Nengo=../nengo!./components/time_axes');
require('imports?Nengo=../nengo!./components/xy_axes');
require('./components/xyvalue.css');
require('imports?Nengo=../nengo,d3!./components/xyvalue');
