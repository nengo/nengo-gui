/** namespace for all Nengo visualization */
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


Nengo.get_transform = function(element) {
    if ($(element).css('transform') === undefined) {
       var target = '-webkit-transform';
    } else {
       var target = 'transform';
    }
    //Ugly method of finding the current transform of the element
    var holde = $(element).css(target).match(/(-?[0-9\.]+)/g);
    return {x:Number(holde[4]), y:Number(holde[5])};
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
    //Color blind palette with blue, green, red, magenta, yellow, cyan
    var palette = ["#1c73b3","#039f74","#d65e00","#cd79a7","#f0e542","#56b4ea"];
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
