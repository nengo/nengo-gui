var menu_open = true;
var menu_width = document.getElementsByClassName("sidenav")[0].offsetWidth;
var component_menu = $('#Component_menu');
var download_menu = $('#Download_menu');
var config_menu = $('#Config_menu');



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

function focus_reset(){
  var menu_items = $(".menu_tab")
  menu_items.each(function(index){
   $(this).removeClass("selected");
  });
}

$('.side_toggle').on('click',function(){
    toggle_side_nav();
});

$('#Component_menu').click(function(){
  var element = document.getElementById("Menu_info");
  var width = element.offsetWidth;
  element.style.transform = "translate(0px)";
  focus_reset();
  $(this).addClass("selected");
});

$('#Download_menu').click(function(){
  var element = document.getElementById("Menu_info");
  var width = element.offsetWidth;
  element.style.transform = "translate("+String(-menu_width)+"px)";
  focus_reset();
  $(this).addClass("selected");
});

$('#Config_menu').click(function(){
  var element = document.getElementById("Menu_info");
  var width = element.offsetWidth;
  element.style.transform = "translate("+String(-menu_width*2)+"px)";
  focus_reset();
  $(this).addClass("selected");
});

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
