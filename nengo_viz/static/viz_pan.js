/* Calculates drag deltas on background */

VIZ.pan = {};

VIZ.pan.enabled = false;

/*A Posn is an object with:
 posn.x - int 
 posn.y - int
*/

//Used for storing the cumulative x and y panning of the model


function init_main_events() {
	VIZ.pan.cposn = {	ul:{x:0, y:0}, 
						lr:{x:$('#netgraph').width(), y:$('#netgraph').height()}
					}
	//console.log(VIZ.pan.cposn);
	$(".netgraph")
		.mousedown(function(event) { //Listens for mousedown
			if (event.target == $('.netgraph')[0]) { //Checks that you have indeed clicked the #main element
				VIZ.pan.enabled = true; //Enables panning
			}
			VIZ.pan.iposn = {x:event.pageX, y:event.pageY}; //Gets the starting point of your mouse
										 //Used for storing the initial x and y points of the mouse when panning
		})
		.mousemove(function(event) {// Listens for mouse movement
			if (VIZ.pan.enabled) { // Checks if panning is allowed
			    var deltaX = event.pageX - VIZ.pan.iposn.x; // Calculates differences using initial x and y reference points
			    var deltaY = event.pageY - VIZ.pan.iposn.y;
			    VIZ.pan.iposn.x = event.pageX; // Updates initial reference points
			    VIZ.pan.iposn.y = event.pageY;
			    VIZ.pan.shift(deltaX, deltaY); // Call the pan function with the differences that should be made
			}
		})
		.mouseup(function() {// Listens for mouseup
		    VIZ.pan.enabled = false;//Disables panning
		});
	}

/*Pass this function the amount of change you want to apply to the screen*/
VIZ.pan.shift = function(dx,dy) {
	var cpp = cord_per_px(VIZ.pan.cposn)
	//console.log(cpp.x, cpp.y);
	VIZ.pan.cposn.ul.x -= dx * cpp.x;
	VIZ.pan.cposn.ul.y -= dy * cpp.y;
	VIZ.pan.cposn.lr.x -= dx * cpp.x;
	VIZ.pan.cposn.lr.y -= dy * cpp.y;
	//console.log(VIZ.pan.cposn.ul, VIZ.pan.cposn.lr);
	// Replace this part with a redraw using coords instead 
	VIZ.pan.redraw();


};

/*snap_to pans the screen to the specified posn cords quickly. 
Effectively the same as changing the cposn cords to the posn points, and panning the screen accordingly*/
VIZ.pan.snap_to = function(posn) {
	var dx = VIZ.pan.cposn.ul.x - VIZ.pan.cposn.lr.x;
	var dy = VIZ.pan.cposn.ul.y - VIZ.pan.cposn.lr.y;
	VIZ.pan.cposn.ul.x = posn.x;
	VIZ.pan.cposn.ul.y = posn.y;
	VIZ.pan.cposn.lr.x = VIZ.pan.cposn.ul.x - dx;
	VIZ.pan.cposn.lr.y = VIZ.pan.cposn.ul.y - dy;
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

function cord_per_px(scrn) {
	var cord_width = scrn.lr.x - scrn.ul.x;

	var cord_height = scrn.lr.y - scrn.ul.y;

	var px_width = $('#netgraph').width();

	var px_height = $('#netgraph').height();
	
	return {x: cord_width / px_width,
	 y: cord_height / px_height};
}

VIZ.pan.redraw = function() {
	$('.graph').each(function(i, element){ // Get all the graph elements\
		var transform_val = cord_map(VIZ.pan.cposn, VIZ.get_cords(element));
		VIZ.set_transform(element, transform_val.x, transform_val.y);
	});
}

//Get those main event listeners up and running
setTimeout(function(){init_main_events();},100);
