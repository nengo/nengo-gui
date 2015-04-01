VIZ.scale = {};

//A posn is an object with {x: int , y: int}

//A screen is a rectangle given by two corner posns, {ul: posn, lr: posn}

VIZ.scale.events = function (){
	document.getElementById('netgraph').addEventListener('mousewheel', function (event){
		var step_size = 1.1;
		var wheel = event.wheelDelta / 120;
		wheel = wheel < 0 ? step_size : 1.0 / step_size;
		console.log(wheel);
		var screen_px = $('#netgraph').width();

		var dif_x_one = VIZ.pan.cposn.lr.x - VIZ.pan.cposn.ul.x;

		var k = screen_px / dif_x_one;

		var mouse_cords = (event.offsetX * dif_x_one / screen_px) + VIZ.pan.cposn.ul.x;

		var post_width_in_cords = dif_x_one * wheel;

		var j = screen_px / post_width_in_cords;

		var new_urx = (mouse_cords - (k * mouse_cords - k * VIZ.pan.cposn.ul.x) / j); 
		
		////////////////////////////

		var screen_px_y = $('#netgraph').height();

		var cord_height = VIZ.pan.cposn.lr.y - VIZ.pan.cposn.ul.y; // dif_x_one_y

		var scale_y = screen_px_y / cord_height; //ky

		var mouse_cord_y = (event.offsetY * cord_height / screen_px_y) + VIZ.pan.cposn.ul.y;

		var post_cord_height = cord_height * wheel;

		var post_scale_y = screen_px_y / post_cord_height; //ky

		var new_ury = (mouse_cord_y - (scale_y * mouse_cord_y - scale_y * VIZ.pan.cposn.ul.y) / post_scale_y) 

		////////////////////////////////////////////////////

		VIZ.pan.cposn.ul.x = new_urx;
		VIZ.pan.cposn.ul.y = new_ury;
		VIZ.pan.cposn.lr.x = new_urx + post_width_in_cords;
		VIZ.pan.cposn.lr.y = new_ury + post_cord_height;
		console.log(mouse_cords, mouse_cord_y);
		VIZ.pan.redraw();
	});
}


//setTimeout(init,1000);


