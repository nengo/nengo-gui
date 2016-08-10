/**
 * Menu for the side of the GUI.
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load.
 */

import "./side_menu.css";

export default class SideMenu {

    constructor (sim) {
        var self = this;
        var file_browser_open = false;
        self.sim = sim;
        self.modal = self.sim.modal;
        self.netgraph = self.modal.netgraph;
        self.config = self.netgraph.config;
        // Menu initially closed
        self.menu_open = false;

        self.menu_width = document.getElementsByClassName("sidenav-container")[0]
            .offsetWidth;

        // Gathers all the menu tabs from the HTML for the Event Handlers
        self.tabs = $(".tab-content");

        self.top_buttons = ['#Open_file_button', '#Config_menu'];
        self.initialize_button_handlers();

        // ----EVENT HANDLERS----

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
            self.netgraph.toggleMiniMap();
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

    on_resize() {
        var h = $('.sidenav-container').height();
        $('#filebrowser').height(h);
    };

    /**
     * Finds all menu tabs and creates handlers.
     */
    initialize_button_handlers() {
        // Handles Menu tab switching
        for (var x = 0; x < this.top_buttons.length; x++) {
            $(this.top_buttons[x]).click(
                this.menu_tab_click(
                    this.top_buttons[x], x, true
                ));
        }
    };

    toggle_side_nav() {
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

    show_side_nav() {
        if (!this.menu_open) {
            this.toggle_side_nav();
        }
    };

    hide_side_nav() {
        if (this.menu_open) {
            this.toggle_side_nav();
        }
    };

    /**
     * Determines which tab should be in view when clicked.
     */
    menu_tab_click(it, pos_num, close_if_selected) {
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

    /**
     * Deselects all menu tabs.
     */
    focus_reset() {
        for (var i in this.top_buttons) {
            $(this.top_buttons[i]).removeClass("selected");
        }
    };

    /**
     * This lets you browse the files available on the server.
     */
    file_browser() {
        this.sim.ws.send('browse');

        var fb = $('#filebrowser');
        fb.fileTree({
            root: this.config.scriptdir,
            script: '/browse?root=' + this.config.scriptdir
        },
                    function(file) {
                        window.location.assign('/?filename=' + file);
                    }
                   );

    };

    /**
     * Export the layout to the SVG in Downloads folder.
     */
    pdf_modal() {
        this.modal.title("Export the layout to SVG");
        this.modal.text_body("Do you want to save the file?", "info");
        this.modal.footer('confirm_savepdf');
        this.modal.show();
    };

    /**
     * Export the graph data to the CSV in Downloads folder.
     */
    csv_modal() {
        this.modal.title("Export the graph data to CSV");
        this.modal.text_body("Do you want to save the file?", "info");
        this.modal.footer('confirm_savecsv');
        this.modal.show();
    };

}
