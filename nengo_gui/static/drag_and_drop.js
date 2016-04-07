$(".draggable").draggable({helper: "clone",appendTo: "#main",});

$( ".droppable" ).droppable({
      drop: function( event, ui ) {
      var draggableId = ui.draggable.attr("id");
      var width = $(".sub_menu")[0].offsetWidth;
      if(event.clientX > width+50 ){
        add_component(draggableId);
      }
   }
});

function add_component(type){
  var tab = "    "
  var editor = ace.edit('editor');
  var code = editor.getValue();
  var last_line = editor.session.getLength();
  var componet_code;

  var component_num = code.split(type).length - 1;

  if(type == "Ensemble"){
    componet_code = "ensemble"+component_num+" = nengo.Ensemble(n_neurons=50, dimensions=1)\n";
  } else if(type == "Node"){
    componet_code = "stim"+component_num+" = nengo.Node([0])\n"
  }

  editor.gotoLine(last_line);
  editor.insert(tab+componet_code);
}
