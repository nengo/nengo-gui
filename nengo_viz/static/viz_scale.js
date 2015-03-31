//A posn is an object with {x: int , y: int}

//A screen is a rectangle given by two corner posns, {ul: posn, lr: posn}

function init(){
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

		var new_urx = (mouse_cords - (k*mouse_cords - k*VIZ.pan.cposn.ul.x)/j) 
		
		////////////////////////////

		var screen_pxy = $('#netgraph').height();

		var dif_x_oney = VIZ.pan.cposn.lr.y - VIZ.pan.cposn.ul.y;

		var ky = screen_pxy / dif_x_oney;

		var mouse_cordsy = (event.offsetY * dif_x_oney / screen_pxy) + VIZ.pan.cposn.ul.y;

		var post_height_in_cords = dif_x_oney * wheel;

		var jy = screen_pxy / post_height_in_cords;

		var new_ury = (mouse_cordsy - (ky*mouse_cordsy - ky*VIZ.pan.cposn.ul.y)/jy) 

		//(mouse_cordsy + ky*(-mouse_cordsy + VIZ.pan.cposn.ul.y)/jy) 

		////////////////////////////////////////////////////

		VIZ.pan.cposn.ul.x = new_urx;
		VIZ.pan.cposn.ul.y = new_ury;
		VIZ.pan.cposn.lr.x = new_urx + post_width_in_cords;
		VIZ.pan.cposn.lr.y = new_ury + post_height_in_cords;
		console.log(mouse_cords, mouse_cordsy);
		VIZ.pan.redraw();




		/*
 // this is the cord position

		var new_dim = scale_screen(wheel);

		var scale_one = cord_per_px(VIZ.pan.cposn);

		var scale_two = cord_per_px(new_dim); // wheel is 1.1 or ~0.9

		var new_width = new_dim.lr.x - new_dim.ul.x;
		var new_height = new_dim.lr.y - new_dim.ul.y;
		
		var new_offset_x = (scale_one.x * VIZ.pan.cposn.ul.x)/ scale_two.x 
		- (scale_one.x * cord_posn.x) / scale_two.x 
		+ cord_posn.x;

		var new_offset_y = (scale_one.y * VIZ.pan.cposn.ul.y)/ scale_two.y 
		- (scale_one.y * cord_posn.y) / scale_two.y
		+ cord_posn.y;

		VIZ.pan.cposn.ul.x = new_offset_x;
		
		VIZ.pan.cposn.ul.y = new_offset_y;
		VIZ.pan.cposn.lr.x = new_offset_x + new_width;
		VIZ.pan.cposn.lr.y = new_offset_y + new_height;
		console.log(VIZ.pan.cposn)
		VIZ.pan.redraw();
*/
//		var cord_posn = px_to_cord({x:event.offsetX, y:event.offsetY}); //x


		//VIZ.gscale *= wheel;
		/*
		var scale_one = cord_per_px(VIZ.pan.cposn)
		var scale_two = cord_per_px(scale_screen(wheel));

		

		var holdx  = (cord_posn.x/scale_two.x - cord_posn.x/scale_one.x) + VIZ.pan.cposn.ul.x;
		var holdy = (cord_posn.y/scale_two.y - cord_posn.y/scale_one.y) + VIZ.pan.cposn.ul.y;
		set_screen(holdx, holdy, holdx, holdy)
		var n = scale_screen(wheel);

		VIZ.pan.cposn.ul.x = n.ul.x
		VIZ.pan.cposn.ul.y = n.ul.y
		VIZ.pan.cposn.lr.x = n.lr.x
		VIZ.pan.cposn.lr.y = n.lr.y*/
		//console.log("aa",hold);



		/*

		VIZ.pan.redraw();
`*/

	});
}


//Consumes a posn representing a px location on the screen,
// returns a posn representing the cord at that px location.
/*
function px_to_cord(posn) {
	var scale = cord_per_px(VIZ.pan.cposn);
	var x = scale.x * posn.x + VIZ.pan.cposn.ul.x
	var y = scale.y * posn.y + VIZ.pan.cposn.ul.y
	return {x: x, y: y};
}

function scale_screen(wheel) {
	//.log("wheel scale", wheel)
	var a = VIZ.pan.cposn.ul.x;
	var b = VIZ.pan.cposn.lr.x * wheel;
	var c = VIZ.pan.cposn.ul.y;
	var d = VIZ.pan.cposn.lr.y * wheel;
	return{ul:{x:a,y:c}, lr:{x:b, y:d}};
}

function set_screen(ulx, uly, lrx, lry) {
	VIZ.pan.cposn.ul.x += ulx;
	VIZ.pan.cposn.ul.y += uly;
	VIZ.pan.cposn.lr.x += lrx;
	VIZ.pan.cposn.lr.y += lry;
}
*/
setTimeout(init,1000);


