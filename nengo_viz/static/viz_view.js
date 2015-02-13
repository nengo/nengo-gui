VIZ.view = function () {
	var hold = document.getElementsByClassName('graph');
	var x_pos = 0;
	var y_pos = 0;
	setTimeout(
		function(){
			for (var i = 0; i < hold.length; i++){
				VIZ.set_transform(hold[i], x_pos, y_pos);
				x_pos += hold[i].offsetWidth;
			}
	},0);

}