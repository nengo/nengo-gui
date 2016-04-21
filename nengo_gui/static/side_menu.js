
/**
 * Menu for the side of the GUI
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

  //file_browser
  $('#Open_file_button')[0].addEventListener('click', function () {
      if (!$(this).hasClass('deactivated')) {
          self.file_browser();
      }
  });

  //Modal Handlers
  $('#Pdf_button')[0].addEventListener('click', function () {
      self.pdf_modal();
  });
  $('#Download_button')[0].addEventListener('click', function () {
      self.csv_modal();
  });
  $('#Minimap_button')[0].addEventListener('click', function () {
      Nengo.netgraph.toggleMiniMap();
  });

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

/** This lets you browse the files available on the server */
Nengo.SideMenu.prototype.file_browser = function () {
    sim.ws.send('browse');

    fb = $('#filebrowser');

    if (fb.is(":visible")) {
        fb.fileTree({
            root: Nengo.config.scriptdir,
            script: '/browse?root=' + Nengo.config.scriptdir
        },
        function (file) {
            window.location.assign('/?filename=' + file);
        })
    }
};

/** Export the layout to the SVG in Downloads folder **/
Nengo.SideMenu.prototype.pdf_modal = function () {
    Nengo.modal.title("Export the layout to SVG");
    Nengo.modal.text_body("Do you want to save the file?", "info");
    Nengo.modal.footer('confirm_savepdf');
    Nengo.modal.show();
}

/** Export the graph data to the CSV in Downloads folder **/
Nengo.SideMenu.prototype.csv_modal = function () {
    Nengo.modal.title("Export the graph data to CSV");
    Nengo.modal.text_body("Do you want to save the file?", "info");
    Nengo.modal.footer('confirm_savecsv');
    Nengo.modal.show();
}
