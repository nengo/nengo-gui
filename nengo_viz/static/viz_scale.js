
function init(){
	var scale = 1;
	var originx = 0;
	var originy = 0;

	document.getElementById('netgraph').addEventListener('mousewheel', function (event){
		console.log('asd')
		$('.graph').each(function(i, element){
			var cords = VIZ.get_transform(element);
		    var mousex = event.clientX - cords.x;
		    var mousey = event.clientY - cords.y;
		    var wheel = event.wheelDelta/120;//n or -n
		    

		    //according to Chris comment
		    var zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);
		    VIZ.pan.snap_to(
		        {x:originx, y:originy}
		    );
		    var x_trans = -( mousex / scale + originx - mousex / ( scale * zoom ) );
		    var y_trans = -( mousey / scale + originy - mousey / ( scale * zoom ) );
		    console.log(x_trans, y_trans)
		    VIZ.set_transform(
		    	element,
		        x_trans,
		        y_trans
		    );

		    originx = ( mousex / scale + originx - mousex / ( scale * zoom ) );
		    originy = ( mousey / scale + originy - mousey / ( scale * zoom ) );
		    scale = 1;
		});
	});

}

setTimeout(init,1000);