/* Calculates drag deltas on background */

VIZ.pan = {}

VIZ.pan.enabled = false;


//Used for storing the cumulative x and y panning
VIZ.pan.cx = 0;
VIZ.pan.cy = 0;

$("#main")
	.mousedown(function(event) { //Listens for mousedown
		if (event.target == $('#main')[0]) { //Checks that you have indeed clicked the #main element
			VIZ.pan.enabled = true; //Enables panning
		}
		VIZ.pan.ix = event.pageX; //Gets the starting point of your mouse
		VIZ.pan.iy = event.pageY; //Used for storing the initial x and y points of the mouse when panning
	})
	.mousemove(function(event) {// Listens for mouse movement
		if (VIZ.pan.enabled) { // Checks if panning is allowed
		    var deltaX = event.pageX - VIZ.pan.ix; // Calculates differences using initial x and y reference points
		    var deltaY = event.pageY - VIZ.pan.iy;
		    VIZ.pan.ix = event.pageX; // Updates initial reference points
		    VIZ.pan.iy = event.pageY;
		    VIZ.pan.shift(deltaX,deltaY); // Call the pan function with the differences that should be made
		}
	})
	.mouseup(function() {// Listens for mouseup
	    VIZ.pan.enabled = false  //Disables panning
	});


/**/

VIZ.pan.shift = function(dx,dy) {
	VIZ.pan.cx += dx;
	VIZ.pan.cy += dy;
	console.log(VIZ.pan.cx, VIZ.pan.cy)
	$('.graph').each(function(i, element){ // Get all the graph elements
		var holde = $(element).css('transform').match(/(-?[0-9\.]+)/g); //Ugly method of finding the current transform of the element
		VIZ.set_transform(element, Number(holde[4]) + dx, Number(holde[5]) + dy); // Do the transformation
	})
}
