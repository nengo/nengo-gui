VIZ.view = function () {
	var hold = document.getElementsByClassName('graph');
	var x_pos = 0;
	var y_pos = 0;
	setTimeout(
		function(){
			for (var i = 0; i < hold.length; i++){
				VIZ.set_transform(hold[i], x_pos, y_pos);
				var w = $(window).width();
				var next_pos = x_pos + hold[i].offsetWidth;
				if (next_pos < w){
					x_pos += hold[i].offsetWidth;
				}
				else{
					x_pos = 0;
					//This assumes all components have the same height
					//Assumes that all components can fit on page without
					//resize
					y_pos += hold[i].offsetHeight;
				}
			}
	},0);

}