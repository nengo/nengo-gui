/* Calculates drag deltas on background */
VIZ.pan_enabled = false;

//Used for storing the initial x and y points of the mouse when panning
var ix;
var iy;

$("#main")
	.mousedown(function(event) { //Listens for mousedown
		if (event.target == $('#main')[0]) { //Checks that you have indeed clicked the #main element
			VIZ.pan_enabled = true; //Enables panning
		}
		ix = event.pageX; //Gets the starting point of your mouse
		iy = event.pageY;
	})
	.mousemove(function(event) {// Listens for mouse movement
		if (VIZ.pan_enabled) { // Checks if panning is allowed
		    var deltaX = event.pageX - ix; // Calculates differences using initial x and y reference points
		    var deltaY = event.pageY - iy;
		    ix = event.pageX; // Updates reference points
		    iy = event.pageY;
		    VIZ.pan(deltaX,deltaY); // Call the pan function with the differences that should be made
		}
	})
	.mouseup(function() {// Listens for mouseup
	    VIZ.pan_enabled = false  //Disables panning
	});


/**/

VIZ.pan = function(dx,dy) {
	$('.graph').each(function(i, element){ // Get all the graph elements
		var holde = $(element).css('transform').match(/(-?[0-9\.]+)/g); //Ugly method of finding the current transform of the element
		VIZ.set_transform(element, Number(holde[4]) + dx, Number(holde[5]) + dy); // Do the transformation
	})
}
