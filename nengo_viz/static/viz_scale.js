VIZ.scale = {};

//Tracks the cumulative scaling done
VIZ.scale.cumulative = 1;

//The magnitude of the zoom being applied to the netgraph and the components
VIZ.scale.step_size = 1.1;
if (navigator.appVersion.indexOf("Mac")!=-1) {
    VIZ.scale.step_size = 1.05;
}

//A posn is an object with {x: int , y: int}

//A screen is a rectangle given by two corner posns, {ul: posn, lr: posn}

VIZ.scale.zoom = function (wheel, offx, offy){
	VIZ.scale.redraw_size(wheel, wheel);

	wheel = wheel < 1 ? VIZ.scale.step_size : 1.0 / VIZ.scale.step_size;

	VIZ.scale.cumulative *= wheel;

	if (offx === undefined || offy === undefined) { //in case the zoom function is called without offsets
		var offsetX = VIZ.Screen.ul.x;
		var offsetY = VIZ.Screen.ul.y;
	}
	else{
		var offsetX = offx;
		var offsetY = offy;
	}

	////////////////////////////////// X scaling math
	var screen_px_x = $('#netgraph').width();

	var cord_width = VIZ.Screen.lr.x - VIZ.Screen.ul.x;

	var scale_x = screen_px_x / cord_width;

	var mouse_cord_x = (offsetX * cord_width / screen_px_x) + VIZ.Screen.ul.x;

	var post_cord_width = cord_width * wheel;

	var post_scale_x = screen_px_x / post_cord_width;

	var new_urx = (mouse_cord_x - (scale_x * mouse_cord_x - scale_x * VIZ.Screen.ul.x) / post_scale_x);

	//////////////////////////// Y scaling math

	var screen_px_y = $('#netgraph').height();

	var cord_height = VIZ.Screen.lr.y - VIZ.Screen.ul.y;

	var scale_y = screen_px_y / cord_height;

	var mouse_cord_y = (offsetY * cord_height / screen_px_y) + VIZ.Screen.ul.y;

	var post_cord_height = cord_height * wheel;

	var post_scale_y = screen_px_y / post_cord_height;

	var new_ury = (mouse_cord_y - (scale_y * mouse_cord_y - scale_y * VIZ.Screen.ul.y) / post_scale_y);

	////////////////////////////////////////////////////

	VIZ.Screen.ul.x = new_urx;
	VIZ.Screen.ul.y = new_ury;
	VIZ.Screen.lr.x = new_urx + post_cord_width;
	VIZ.Screen.lr.y = new_ury + post_cord_height;
	VIZ.pan.redraw();
}

VIZ.scale.redraw_size = function(scale_x, scale_y) {
	for (var i = 0; i < VIZ.Component.components.length; i++){
		var w = VIZ.Component.components[i].width;
		var h = VIZ.Component.components[i].height;
		VIZ.Component.components[i].on_resize(w * scale_x, h * scale_y);
	}
}
