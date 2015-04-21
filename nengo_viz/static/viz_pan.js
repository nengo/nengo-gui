/* Calculates drag deltas on background */

VIZ.pan = {};

/*A Posn is an object with:
 posn.x - int 
 posn.y - int
*/

//Used for storing the cumulative x and y panning of the model


VIZ.pan.events = function () {
    if (VIZ.Screen === undefined) {
        VIZ.Screen = {	ul:{x:0, y:0}, 
                            lr:{x:$('#netgraph').width(), y:$('#netgraph').height()}
                        }
    }
}

/*Pass this function the amount of change you want to apply to the screen*/
VIZ.pan.shift = function(dx,dy) {
	var cpp = cord_per_px(VIZ.Screen)
	VIZ.Screen.ul.x -= dx * cpp.x;
	VIZ.Screen.ul.y -= dy * cpp.y;
	VIZ.Screen.lr.x -= dx * cpp.x;
	VIZ.Screen.lr.y -= dy * cpp.y;
	// Replace this part with a redraw using coords instead 
	VIZ.pan.redraw();


};

/*snap_to pans the screen to the specified posn cords quickly. 
Effectively the same as changing the cposn cords to the posn points, and panning the screen accordingly*/
VIZ.pan.snap_to = function(posn) {
	var dx = VIZ.Screen.ul.x - VIZ.Screen.lr.x;
	var dy = VIZ.Screen.ul.y - VIZ.Screen.lr.y;
	VIZ.Screen.ul.x = posn.x;
	VIZ.Screen.ul.y = posn.y;
	VIZ.Screen.lr.x = VIZ.Screen.ul.x - dx;
	VIZ.Screen.lr.y = VIZ.Screen.ul.y - dy;
	VIZ.pan.redraw();
};

VIZ.get_cords = function(element) {
	var datax = parseFloat(element.getAttribute('data-x'));
    var datay = parseFloat(element.getAttribute('data-y'));
    return {x: datax , y:datay};
}

//consumes a scrn and a cord posn and gives a posn that is to be used for a pixel transform
function cord_map(scrn, posn) {
	
	var cord_width = scrn.lr.x - scrn.ul.x;

	var cord_height = scrn.lr.y - scrn.ul.y;

	var px_width = $('#netgraph').width();

	var px_height = $('#netgraph').height();

	return {
		x: (px_width / cord_width * (posn.x - scrn.ul.x)),
	 	y: (px_height / cord_height * (posn.y - scrn.ul.y))
	 };
}

function map_px_to_cord(scrn, px) {
	var cord_width = scrn.lr.x - scrn.ul.x;

	var cord_height = scrn.lr.y - scrn.ul.y;

	var px_width = $('#netgraph').width();

	var px_height = $('#netgraph').height();

	return {
		x: scrn.ul.x + px.x * (cord_width / px_width),
		y: scrn.ul.y + px.y * (cord_height / px_height),
	 };
}
    


function cord_per_px(scrn) {
	var cord_width = scrn.lr.x - scrn.ul.x;

	var cord_height = scrn.lr.y - scrn.ul.y;

	var px_width = $('#netgraph').width();

	var px_height = $('#netgraph').height();
	
	return {x: cord_width / px_width,
	 y: cord_height / px_height};
}

VIZ.pan.redraw = function() {
	$('.graph').each(function(i, element){ // Get all the graph elements
		var transform_val = cord_map(VIZ.Screen, VIZ.get_cords(element));
		VIZ.set_transform(element, transform_val.x, transform_val.y);
	});
}


