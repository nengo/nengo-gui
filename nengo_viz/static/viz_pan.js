/* Calculates drag deltas on background */

VIZ.pan = {};

/*A Posn is an object with:
 posn.x - int 
 posn.y - int
*/

VIZ.pan.screen_init = function () {
    console.log('screen_init created');
    if (VIZ.Screen === undefined) {
        VIZ.Screen = {  ul:{x:0, y:0}, 
                            lr:{x:$('#netgraph').width(), y:$('#netgraph').height()}
                        }
    }
}

/*Pass this function the amount of change you want to apply to the screen*/
VIZ.pan.shift = function(dx,dy) {
    var cpp = VIZ.pan.cord_per_px(VIZ.Screen)
    VIZ.Screen.ul.x -= dx * cpp.x;
    VIZ.Screen.ul.y -= dy * cpp.y;
    VIZ.Screen.lr.x -= dx * cpp.x;
    VIZ.Screen.lr.y -= dy * cpp.y;
    // Replace this part with a redraw using coords instead 
    VIZ.pan.redraw();
};

/*snap_to pans the screen to the specified posn cords quickly. 
Effectively the same as changing the Screen cords to the posn points, and panning the screen accordingly*/
VIZ.pan.snap_to = function(posn) {
    var dx = VIZ.Screen.ul.x - VIZ.Screen.lr.x;
    var dy = VIZ.Screen.ul.y - VIZ.Screen.lr.y;
    VIZ.Screen.ul.x = posn.x;
    VIZ.Screen.ul.y = posn.y;
    VIZ.Screen.lr.x = VIZ.Screen.ul.x - dx;
    VIZ.Screen.lr.y = VIZ.Screen.ul.y - dy;
    VIZ.pan.redraw();
};

//Gets the cords of an element
VIZ.pan.get_cords = function(element) {
    var datax = parseFloat(element.getAttribute('data-x'));
    var datay = parseFloat(element.getAttribute('data-y'));
    return {x: datax , y:datay};
}

//consumes a scrn and a cord posn and gives a posn that is to be used for a pixel transform
VIZ.pan.cord_map = function (scrn, posn) {
    
    var cord_width = scrn.lr.x - scrn.ul.x;

    var cord_height = scrn.lr.y - scrn.ul.y;

    var px_width = $('#netgraph').width();

    var px_height = $('#netgraph').height();

    return {
        x: (px_width / cord_width * (posn.x - scrn.ul.x)),
        y: (px_height / cord_height * (posn.y - scrn.ul.y))
     };
}

VIZ.pan.map_px_to_cord = function(scrn, px) {
    var cord_width = scrn.lr.x - scrn.ul.x;

    var cord_height = scrn.lr.y - scrn.ul.y;

    var px_width = $('#netgraph').width();

    var px_height = $('#netgraph').height();

    return {
        x: scrn.ul.x + px.x * (cord_width / px_width),
        y: scrn.ul.y + px.y * (cord_height / px_height),
     };
}

VIZ.pan.cord_per_px = function (scrn) {
    var cord_width = scrn.lr.x - scrn.ul.x;

    var cord_height = scrn.lr.y - scrn.ul.y;

    var px_width = $('#netgraph').width();

    var px_height = $('#netgraph').height();
    
    return {x: cord_width / px_width,
     y: cord_height / px_height};
}

VIZ.pan.redraw = function() {
    $('.graph').each(function(i, element){ // Get all the graph elements
        var transform_val = VIZ.pan.cord_map(VIZ.Screen, VIZ.pan.get_cords(element));
        VIZ.pan.draw_item(element, transform_val.x, transform_val.y);
    });
}

//draw an item using its centre point as the location of drawing
//This allows coordinates to still be situated at the top right of the element
// while being able to draw the object around the centre point
VIZ.pan.draw_item = function (element, x, y){
    var w = $(element).width();
    var h = $(element).height();
    x = x - w / 2;
    y = y - h / 2; 
    VIZ.set_transform(element, x , y);
}
