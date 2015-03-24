
function init(){
var scale = 1;
var originx = 0;
var originy = 0;

document.getElementById('netgraph').addEventListener('mousewheel', function (event){
	console.log('asd')
	$('.graph').each(function(i, element){
		console.log(element)
		var cords = VIZ.get_transform(element);
	    var mousex = event.clientX - cords.x;
	    var mousey = event.clientY - cords.y;
	    var wheel = event.wheelDelta/120;//n or -n

	    //according to Chris comment
	    var zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);

	    VIZ.pan.snap_to(
	        {x:originx, y:originy}
	    );
	    VIZ.set_transform(
	    	element,
	        -( mousex / scale + originx - mousex / ( scale * zoom ) ),
	        -( mousey / scale + originy - mousey / ( scale * zoom ) )
	    );

	    originx = ( mousex / scale + originx - mousex / ( scale * zoom ) );
	    originy = ( mousey / scale + originy - mousey / ( scale * zoom ) );
	    scale *= zoom;
	});
});

}

setTimeout(init,3000);