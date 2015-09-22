/** namespace for all Nengo visualization */
/** root functions contain miscelaneous utility functions */

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
}

/**
 * Helper function to set the transform of an element.
 */
Nengo.set_transform = function(element, x, y) {
    element.style.webkitTransform =
        element.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
}

/**
 * Create a WebSocket connection to the given id
 */
Nengo.create_websocket = function(uid) {
    var parser = document.createElement('a');
    parser.href = document.URL;
    var ws_url = 'ws://' + parser.host + '/viz_component?uid=' + uid;
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
    var palette = ["#1c73b3", "#039f74", "#d65e00", "#cd79a7", "#f0e542", "#56b4ea"];
    var c = [];

    for (var i = 0; i < N; i++) {
        c.push(palette[i % palette.length]);
    }
    return c;
}

//Check if a string value represents a number
Nengo.is_num = function(value){
    if (!(isNaN(value)) && !(value.trim() == '') ) {
        return true;
    }
    else{
        return false;
    }
}

Nengo.next_zindex = function() {
    Nengo.max_zindex++;
    return Nengo.max_zindex;
}

/* draw a legend */
// the css should probably be dealt with in here somehow
Nengo.draw_legend = function(parent, labels, color_func){
    // "20" is around the size of the font
    legend_svg = d3.select(parent)
                       .append("svg")
                       .attr("width", 150)
                       .attr("height", 20*labels.length);

    legend_svg.selectAll('rect')
              .data(labels)
              .enter()
              .append("rect")
              .attr("x", 0)
              .attr("y", function(d, i){ return i *  20;})
              .attr("width", 10)
              .attr("height", 10)
              .style("fill", color_func);
    
    legend_svg.selectAll('text')
              .data(labels)
              .enter()
              .append("text")
              .attr("x", 15)
              .attr("y", function(d, i){ return i *  20 + 9;})
              .html(function(d, i) {
                    return labels[i];
               });
    return legend_svg;
}
