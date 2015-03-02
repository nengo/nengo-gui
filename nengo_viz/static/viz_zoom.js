VIZ.zoom_disabled = false;

VIZ.zoom = function (e) {
	if (!VIZ.zoom_disabled) {
		var elements = VIZ.shown_components
	    var scroll_speed = 10;
	    var movement = (event.deltaY / 53) * scroll_speed;
		for (var i = 0; i < elements.length ; i++){
			var h = elements[i].height;
			console.log(h)
			var w = elements[i].width;
			elements[i].on_resize(w + movement,h + movement)
		}
	}
}