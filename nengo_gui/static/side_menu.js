
/**
 * Menu for the side of the GUI
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load
 */

Nengo.SideMenu = function() {
    var self = this;
    var file_browser_open = false;
    // Menu initially closed
    self.menu_open = false;

    self.menu_width = document.getElementsByClassName("sidenav-container")[0]
                              .offsetWidth;

    // Gathers all the menu tabs from the HTML for the Event Handlers
    self.tabs = $(".tab-content");

    self.top_buttons = ['#Open_file_button', '#Config_menu'];
    self.initialize_button_handlers();

    //----EVENT HANDLERS----

    // file_browser
    $('#Open_file_button')[0].addEventListener('click', function() {
        if (!$(this).hasClass('deactivated') && file_browser_open == false) {
            file_browser_open = true;
            self.file_browser();
        }
    });

    // Modal Handlers
    $('#Pdf_button')[0].addEventListener('click', function() {
        self.pdf_modal();
    });
    $('#Download_button')[0].addEventListener('click', function() {
        self.csv_modal();
    });
    $('#Minimap_button')[0].addEventListener('click', function() {
        Nengo.netgraph.toggleMiniMap();
    });

    // Handles Accordions
    var accord_num = document.getElementsByClassName('accordion-container')
                             .length + 1;

    for (var x = 1; x < accord_num; x++) {
        $('#accordion-container' + String(x))
            .find('.accordion-toggle')
            .click(function() {

                // Expand or collapse this panel
                $(this).next().slideToggle();

                // Hide the other panels
                $(".accordion-content").not($(this).next()).slideUp();

            });
    }

    $(window).on('resize', function() {self.on_resize();});
    self.on_resize();
};

Nengo.SideMenu.prototype.on_resize = function() {
    var h = $('.sidenav-container').height();
    $('#filebrowser').height(h);
};


//** Finds all menu tabs and creates handlers **/
Nengo.SideMenu.prototype.initialize_button_handlers = function() {
    // Handles Menu tab switching
    for (var x = 0; x < this.top_buttons.length; x++) {
        $(this.top_buttons[x]).click(
            this.menu_tab_click(
                this.top_buttons[x], x, true
            ));
    }
};

Nengo.SideMenu.prototype.toggle_side_nav = function() {
    var self = this;
    var element = document.getElementsByClassName("sidenav-container")[0];
    var trans_val = "";

    if (self.menu_open === false) {
        trans_val = "0";
        self.menu_open = true;
    } else {
        trans_val = String(-self.menu_width);
        self.menu_open = false;
    }

    element.style.transform = "translate(" + trans_val + "px)";
};

Nengo.SideMenu.prototype.show_side_nav = function() {
    if (!this.menu_open) {
        this.toggle_side_nav();
    }
}

Nengo.SideMenu.prototype.hide_side_nav = function() {
    if (this.menu_open) {
        this.toggle_side_nav();
    }
}


//** Determines which tab should be in view when clicked*/
Nengo.SideMenu.prototype.menu_tab_click = function(it, pos_num, close_if_selected) {
    var self = this;
    var trans_func = function() {
        if ($(it).hasClass('deactivated')) {
            return;
        }
        if (close_if_selected && self.menu_open && $(it).hasClass('selected')) {
            self.hide_side_nav();
            self.focus_reset();
        } else {
            self.show_side_nav();
            var element = document.getElementById("Menu_content");
            var trans_val = String(-self.menu_width * pos_num);
            element.style.transform = "translate(" + trans_val + "px)";
            self.focus_reset();
            $(it).addClass("selected");
        }
    };
    return trans_func;
};

//** Deselects All menu tabs/
Nengo.SideMenu.prototype.focus_reset = function() {
    for (var i in this.top_buttons) {
        $(this.top_buttons[i]).removeClass("selected");
    }
};

/** This lets you browse the files available on the server */
Nengo.SideMenu.prototype.file_browser = function() {
    sim.ws.send('browse');

    fb = $('#filebrowser');
    fb.fileTree({
            root: Nengo.config.scriptdir,
            script: '/browse?root=' + Nengo.config.scriptdir
        },
        function(file) {
            window.location.assign('/?filename=' + file);
        }
    );

};

/** Export the layout to the SVG in Downloads folder **/
Nengo.SideMenu.prototype.pdf_modal = function() {
    Nengo.modal.title("Export the layout to SVG");
    Nengo.modal.text_body("Do you want to save the file?", "info");
    Nengo.modal.footer('confirm_savepdf');
    Nengo.modal.show();
};

/** Export the graph data to the CSV in Downloads folder **/
Nengo.SideMenu.prototype.csv_modal = function() {
    Nengo.modal.title("Export the graph data to CSV");
    Nengo.modal.text_body("Do you want to save the file?", "info");
    Nengo.modal.footer('confirm_savecsv');
    Nengo.modal.show();
};
