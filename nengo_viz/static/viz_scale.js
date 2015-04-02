VIZ.scale = {};
VIZ.scale.cumulative = 1;

//A posn is an object with {x: int , y: int}

//A screen is a rectangle given by two corner posns, {ul: posn, lr: posn}

VIZ.scale.events = function (){
	document.getElementById('netgraph').addEventListener('mousewheel', function (event){
		VIZ.scale.step_size = 1.1;
		var wheel = event.wheelDelta / 120;
		wheel = wheel < 0 ? VIZ.scale.step_size : 1.0 / VIZ.scale.step_size;
		VIZ.scale.zoom(wheel, event);
	});
}

VIZ.scale.zoom = function (wheel, event){

	VIZ.scale.cumulative *= wheel;

	if (event === undefined) {
		var offsetX = VIZ.pan.screen.ul.x;
		var offsetY = VIZ.pan.screen.ul.y;
	}
	else{
		var offsetX = event.offsetX;
		var offsetY = event.offsetY;
	}

	////////////////////////////////// X scaling
	var screen_px_x = $('#netgraph').width();

	var cord_width = VIZ.pan.screen.lr.x - VIZ.pan.screen.ul.x; 

	var scale_x = screen_px_x / cord_width;

	var mouse_cord_x = (offsetX * cord_width / screen_px_x) + VIZ.pan.screen.ul.x;

	var post_cord_width = cord_width * wheel;

	var post_scale_x = screen_px_x / post_cord_width;

	var new_urx = (mouse_cord_x - (scale_x * mouse_cord_x - scale_x * VIZ.pan.screen.ul.x) / post_scale_x); 
	
	//////////////////////////// Y scaling

	var screen_px_y = $('#netgraph').height();

	var cord_height = VIZ.pan.screen.lr.y - VIZ.pan.screen.ul.y; 

	var scale_y = screen_px_y / cord_height; 

	var mouse_cord_y = (offsetY * cord_height / screen_px_y) + VIZ.pan.screen.ul.y;

	var post_cord_height = cord_height * wheel;

	var post_scale_y = screen_px_y / post_cord_height; 

	var new_ury = (mouse_cord_y - (scale_y * mouse_cord_y - scale_y * VIZ.pan.screen.ul.y) / post_scale_y);

	////////////////////////////////////////////////////

	VIZ.pan.screen.ul.x = new_urx;
	VIZ.pan.screen.ul.y = new_ury;
	VIZ.pan.screen.lr.x = new_urx + post_cord_width;
	VIZ.pan.screen.lr.y = new_ury + post_cord_height;
	VIZ.pan.redraw();
	for (var i = 0; i < VIZ.Component.components.length; i++){
		var w = VIZ.Component.components[i].width
		var h = VIZ.Component.components[i].height


		var change = wheel < 1 ? VIZ.scale.step_size : 1.0 / VIZ.scale.step_size;
		VIZ.Component.components[i].on_resize(w * change, h * change);
	}
}

VIZ.scale.redraw_size = function(scale_x, scale_y) {
	for (var i = 0; i < VIZ.Component.components.length; i++){
		var w = VIZ.Component.components[i].width;
		var h = VIZ.Component.components[i].height;
		VIZ.Component.components[i].on_resize(w * scale_x, h * scale_y);
	}
}
