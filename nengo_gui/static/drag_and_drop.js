$(".draggable").draggable({helper: "clone",appendTo: "#main",
 start: function(e, ui)
 {
   $(ui.helper).addClass("drag_elem");
 }
});

$( ".droppable" ).droppable({
      drop: function( event, ui ) {
      var draggableId = ui.draggable.attr("id");
      var width = $(".sub_menu")[0].offsetWidth;
      //alert(width);
      if(event.clientX > width+100 ){
      }
   }
});
