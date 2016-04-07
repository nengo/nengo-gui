
/**
 * Menu for the side of the GUI
 * @constructor
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load
 */

Nengo.SideMenu = function(){
  var self = this;
  //Menu initially open
  self.menu_open = true;

  self.menu_width = document.getElementsByClassName("sidenav")[0].offsetWidth;

  // Gathers all the menu tabs from the HTML for the Event Handlers
  self.sub_menus = [];
  var menu_tabs = $("#menu_tabs > li");
  for(var x = 0; x < menu_tabs.length; x++){
    var id = $(menu_tabs[x]).attr('id');
    self.sub_menus.push("#"+id);
  }
  //----EVENT HANDLERS----

    //Toggles Side Nav
  $('.side_toggle').on('click',function(){
      self.toggle_side_nav();
  });
    //Handles Menu tab switching
  for(var x = 0; x < self.sub_menus.length; x++){
    $(self.sub_menus[x]).click(this.menu_tab_click(self.sub_menus[x],x));
  }

    // Handles Accordions
  var accord_num = document.getElementsByClassName('accordion').length+1;
  for(var x = 1; x < accord_num; x++){
    $('#accordion'+String(x)).find('.accordion-toggle').click(function(){

      //Expand or collapse this panel
      $(this).next().slideToggle();

      //Hide the other panels
      $(".accordion-content").not($(this).next()).slideUp();

    });
  }
  //Initiate After Event Handlers
  $('#Config_menu').click();
  var h = $('.sidenav').height();
  $('#filebrowser').height(h-43);

};

Nengo.SideMenu.prototype.toggle_side_nav = function(){
  var self = this;
  var element = document.getElementsByClassName("sidenav")[0];
    if(self.menu_open === false){
      element.style.transform = "translate(0px)"
      //document.getElementById("mySidenav").style.width = "200px";
      self.menu_open = true;
    } else{
      element.style.transform = "translate("+String(-self.menu_width)+"px)";
      //document.getElementById("mySidenav").style.width = "0px";
      self.menu_open = false;
  }
};

//** Determines which tab should be in view when clicked*/
Nengo.SideMenu.prototype.menu_tab_click = function(it,pos_num){
    var self = this;
    var a = function(){
      var element = document.getElementById("Menu_info");
      element.style.transform = "translate("+String(-self.menu_width*pos_num)+"px)";
      self.focus_reset();
      $(it).addClass("selected");
    }
    return a;
  }

//** Deselects All menu tabs/
Nengo.SideMenu.prototype.focus_reset = function(){
  var menu_items = $(".menu_tab")
  menu_items.each(function(index){
   $(this).removeClass("selected");
  });
}
