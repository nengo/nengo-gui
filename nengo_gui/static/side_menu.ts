/**
 * Menu for the side of the GUI.
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load.
 */

import * as $ from "jquery";

import { config } from "./config";
import "./side_menu.css";

export class SideMenu {
    menu_open;
    menu_width;
    modal;
    netgraph;
    sim;
    tabs;
    top_buttons;

    constructor (sim) {
        let file_browser_open = false;
        this.sim = sim;
        this.modal = this.sim.modal;
        this.netgraph = this.modal.netgraph;
        // Menu initially closed
        this.menu_open = false;

        this.menu_width = (<HTMLElement> document.getElementById("sidenav"))
            .offsetWidth;

        // Gathers all the menu tabs from the HTML for the Event Handlers
        this.tabs = $(".tab-content");

        this.top_buttons = ["#Open_file_button", "#Config_menu"];
        this.initialize_button_handlers();

        // ----EVENT HANDLERS----

        // file_browser
        $("#Open_file_button")[0].addEventListener("click", () => {
            if (!$(this).hasClass("deactivated") && !file_browser_open) {
                file_browser_open = true;
                this.file_browser();
            }
        });

        // Modal Handlers
        $("#Pdf_button")[0].addEventListener("click", () => {
            this.pdf_modal();
        });
        $("#Download_button")[0].addEventListener("click", () => {
            this.csv_modal();
        });
        $("#Minimap_button")[0].addEventListener("click", () => {
            this.netgraph.toggleMiniMap();
        });

        // Handles Accordions
        const accord_num =
            document.getElementsByClassName("accordion-container").length + 1;

        for (let x = 1; x < accord_num; x++) {
            $("#accordion-container" + String(x))
                .find(".accordion-toggle")
                .click(function() {

                    // Expand or collapse this panel
                    $(this).next().slideToggle();

                    // Hide the other panels
                    $(".accordion-content").not($(this).next()).slideUp();
                });
        }

        $(window).on("resize", () => {
            this.on_resize();
        });
        this.on_resize();
    }

    on_resize() {
        $("#filebrowser").height($("#sidenav").height());
    }

    /**
     * Finds all menu tabs and creates handlers.
     */
    initialize_button_handlers() {
        // Handles Menu tab switching
        for (let x = 0; x < this.top_buttons.length; x++) {
            $(this.top_buttons[x]).click(
                this.menu_tab_click(
                    this.top_buttons[x], x, true
                )
            );
        }
    }

    toggle_side_nav() {
        const element = document.getElementById("sidenav");
        let trans_val = "";

        if (this.menu_open === false) {
            trans_val = "0";
            this.menu_open = true;
        } else {
            trans_val = String(-this.menu_width);
            this.menu_open = false;
        }

        element.style.transform = "translate(" + trans_val + "px)";
    }

    show_side_nav() {
        if (!this.menu_open) {
            this.toggle_side_nav();
        }
    }

    hide_side_nav() {
        if (this.menu_open) {
            this.toggle_side_nav();
        }
    }

    /**
     * Determines which tab should be in view when clicked.
     *
     * @param {HTMLElement|string} it - The element
     * @param {number} pos_num - Which tab it corresponds to
     * @param {boolean} close_if_selected - Whether to close the tab
     * @returns {function} Function to call on tab click
     */
    menu_tab_click(it, pos_num, close_if_selected) {
        return () => {
            if ($(it).hasClass("deactivated")) {
                return;
            }
            if (close_if_selected
                    && this.menu_open
                    && $(it).hasClass("selected")) {
                this.hide_side_nav();
                this.focus_reset();
            } else {
                this.show_side_nav();
                const element = document.getElementById("Menu_content");
                const trans_val = String(-this.menu_width * pos_num);
                element.style.transform = "translate(" + trans_val + "px)";
                this.focus_reset();
                $(it).addClass("selected");
            }
        };
    }

    /**
     * Deselects all menu tabs.
     */
    focus_reset() {
        this.top_buttons.forEach(button => {
            $(button).removeClass("selected");
        });
    }

    /**
     * This lets you browse the files available on the server.
     */
    file_browser() {
        this.sim.ws.send("browse");

        const fb = $("#filebrowser");
        fb.fileTree({
            root: config.scriptdir,
            script: "/browse?root=" + config.scriptdir,
        }, file => {
            window.location.assign("/?filename=" + file);
        });
    }

    /**
     * Export the layout to the SVG in Downloads folder.
     */
    pdf_modal() {
        this.modal.title("Export the layout to SVG");
        this.modal.text_body("Do you want to save the file?", "info");
        this.modal.footer("confirm_savepdf");
        this.modal.show();
    }

    /**
     * Export the graph data to the CSV in Downloads folder.
     */
    csv_modal() {
        this.modal.title("Export the graph data to CSV");
        this.modal.text_body("Do you want to save the file?", "info");
        this.modal.footer("confirm_savecsv");
        this.modal.show();
    }

}
