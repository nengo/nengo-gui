var menu_open = true;
var menu_width = document.getElementsByClassName("sidenav")[0].offsetWidth;
//All Menu Tabs must appear in the HTML order in the array
var sub_menus = ['#Component_menu','#Download_menu','#Config_menu'];


function toggle_side_nav(){
  var element = document.getElementsByClassName("sidenav")[0];
    if(menu_open === false){
      element.style.transform = "translate(0px)"
      //document.getElementById("mySidenav").style.width = "200px";
      menu_open = true;
    } else{
      element.style.transform = "translate("+String(-menu_width)+"px)";
      //document.getElementById("mySidenav").style.width = "0px";
      menu_open = false;
  }
}

function menu_tab_click(it,pos_num){
  return function(){
    var element = document.getElementById("Menu_info");
    element.style.transform = "translate("+String(-menu_width*pos_num)+"px)";
    focus_reset();
    $(it).addClass("selected");
  }
}

function focus_reset(){
  var menu_items = $(".menu_tab")
  menu_items.each(function(index){
   $(this).removeClass("selected");
  });
}

//EVENT HANDLERS
$('.side_toggle').on('click',function(){
    toggle_side_nav();
});

for(var x = 0; x < sub_menus.length; x++){
  $(sub_menus[x]).click(menu_tab_click(sub_menus[x],x));
}
//

//RUNTIME
$(document).ready(function($) {
  $('#Config_menu').click();
  var accord_num = document.getElementsByClassName('accordion').length+1;
  for(var x = 1; x < accord_num; x++){
    $('#accordion'+String(x)).find('.accordion-toggle').click(function(){

      //Expand or collapse this panel
      $(this).next().slideToggle('fast');

      //Hide the other panels
      $(".accordion-content").not($(this).next()).slideUp('fast');

    });
}
});
