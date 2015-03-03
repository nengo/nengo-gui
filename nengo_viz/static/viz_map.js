
var map_on = true;

VIZ.draw_map = function (){
    console.log("drawing");
    $('.minimap').remove();
    $('.miniregion').remove();
    if (map_on){
        VIZ.map = $('body').minimap({
            heightRatio : 0.2,
            widthRatio : 0.2,
            offsetHeightRatio : 0.70,
            offsetWidthRatio : 0.035,
            position : "right",
            touch: true,
            smoothScroll: true,
            smoothScrollDelay: 200,
            onPreviewChange: function() {}
        });
    }
}
VIZ.draw_map();
setInterval(function(){VIZ.draw_map()}, 1000);