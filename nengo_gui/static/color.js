/**
 * Generate a color sequence of a given length.
 */

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

/**
 * Color blind-friendly palette.
 */
Nengo.default_colors = function() {
    // Color blind palette with blue, green, red, magenta, yellow, cyan
    var palette = ["#1c73b3", "#039f74", "#d65e00", "#cd79a7", "#f0e542", "#56b4ea"];
    return function(i){ return palette[i%palette.length] };
}

/**
 * Color palette use by Google for graphics, trends, etc...
 */
Nengo.google_colors = function() {
    var palette = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
    return function(i){ return palette[i%palette.length] };
}

/** list of valid color choices */
Nengo.color_choices = [
    ["Nengo Color-Blind Friendly (6 colors)", {"func":Nengo.default_colors(), "mod":6}],
    ["Google (20 colors)", {"func":Nengo.google_colors(), "mod":20}],
    ["D3.js A (20 colors)", {"func":d3.scale.category20(), "mod":20}],
    ["D3.js B (20 colors)", {"func":d3.scale.category20b(), "mod":20}],
    ["D3.js C (20 colors)", {"func":d3.scale.category20c(), "mod":20}]
];
