VIZ.view = {
	ul:{x:0,y:0},
	ur:{x:1000,y:0},
	bl:{x:0,y:700},
	br:{x:1000,y:700}
};

/* Calculates drag deltas on background */
var moused = false;

var ix;
var iy;

$("#main")
	.mousedown(function(event) {
		console.log(event.target == $('#main')[0]);
		if (event.target == $('#main')[0]) {
			moused = true;
		}
		ix = event.pageX;
		iy = event.pageY;
	})
	.mouseup(function() {
	    moused = false
	});


$('#main').mousemove(function(event) {
	if(moused){
	    var deltaX = event.pageX - ix;
	    var deltaY = event.pageY - iy;
	    ix = event.pageX;
	    iy = event.pageY;
	    VIZ.pan(deltaX,deltaY);
	}
})


/**/

VIZ.pan = function(dx,dy) {
	$('.graph').each(function(i, element){
		var holde = $(element).css('transform').match(/(-?[0-9\.]+)/g); //Ugly method of finding the transform currently
		VIZ.set_transform(element,Number(holde[4]) +dx ,Number(holde[5]) + dy);
	})
}

VIZ.scale = function(factor) {
	VIZ.view.ul.x *= factor
	VIZ.view.ur.x *= factor
	VIZ.view.bl.x *= factor
	VIZ.view.br.x *= factor
	VIZ.view.ul.y *= factor
	VIZ.view.ur.y *= factor
	VIZ.view.bl.y *= factor
	VIZ.view.br.y *= factor
}