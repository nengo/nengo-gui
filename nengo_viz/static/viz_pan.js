/* Calculates drag deltas on background */

VIZ.pan = {}

VIZ.pan.enabled = false;


//Used for storing the cumulative x and y panning of the model
VIZ.pan.cposn = {x:0, y:0};


$("#main")
	.mousedown(function(event) { //Listens for mousedown
		if (event.target == $('#main')[0]) { //Checks that you have indeed clicked the #main element
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
	    VIZ.pan.enabled = false  //Disables panning
	});

/*Pass this function the amount of change you want to apply to the screen*/
VIZ.pan.shift = function(dx,dy) {
	VIZ.pan.cposn.x += dx;
	VIZ.pan.cposn.y += dy;
	console.log(VIZ.pan.cposn.x, VIZ.pan.cposn.y)
	$('.graph').each(function(i, element){ // Get all the graph elements
		var holde = $(element).css('transform').match(/(-?[0-9\.]+)/g); //Ugly method of finding the current transform of the element
		VIZ.set_transform(element, Number(holde[4]) + dx, Number(holde[5]) + dy); // Do the transformation
	})
}
