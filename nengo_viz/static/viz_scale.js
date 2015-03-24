var scale = 1;
var originx = 0;
var originy = 0;

document.getElementById('netgraph').addEventListener('mousewheel', 
	function (event){
		$('.graph').each(function(i, element){
	    var mousex = event.clientX - canvas.offsetLeft;
	    var mousey = event.clientY - canvas.offsetTop;
	    var wheel = event.wheelDelta/120;//n or -n

	    //according to Chris comment
	    var zoom = Math.pow(1 + Math.abs(wheel)/2 , wheel > 0 ? 1 : -1);

	    context.translate(
	        originx,
	        originy
	    );
	    context.scale(zoom,zoom);
	    context.translate(
	        -( mousex / scale + originx - mousex / ( scale * zoom ) ),
	        -( mousey / scale + originy - mousey / ( scale * zoom ) )
	    );

	    originx = ( mousex / scale + originx - mousex / ( scale * zoom ) );
	    originy = ( mousey / scale + originy - mousey / ( scale * zoom ) );
	    scale *= zoom;
	}
