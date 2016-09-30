/**
 * Menu for the side of the GUI.
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load.
 */

import * as $ from "jquery";

import { config } from "./config";
import "./side-menu.css";

export class SideMenu {
    menuOpen;
    menuWidth;
    modal;
    netgraph;
    sim;
    tabs;
    topButtons;

    constructor (sim) {
        let fileBrowserOpen = false;
        this.sim = sim;
        this.modal = this.sim.modal;
        this.netgraph = this.modal.netgraph;
        // Menu initially closed
        this.menuOpen = false;

        this.menuWidth = (<HTMLElement> document.getElementById("sidenav"))
            .offsetWidth;

        // Gathers all the menu tabs from the HTML for the Event Handlers
        this.tabs = $(".tab-content");

        this.topButtons = ["#Open_file_button", "#Config_menu"];
        this.initializeButtonHandlers();

        // ----EVENT HANDLERS----

        // file browser
        $("#Open_file_button")[0].addEventListener("click", () => {
            if (!$(this).hasClass("deactivated") && !fileBrowserOpen) {
                fileBrowserOpen = true;
                this.fileBrowser();
            }
        });

        // Modal Handlers
        $("#Pdf_button")[0].addEventListener("click", () => {
            this.pdfModal();
        });
        $("#Download_button")[0].addEventListener("click", () => {
            this.csvModal();
        });
        $("#Minimap_button")[0].addEventListener("click", () => {
            this.netgraph.toggleMiniMap();
        });

        // Handles Accordions
        const accordNum =
            document.getElementsByClassName("accordion-container").length + 1;

        for (let x = 1; x < accordNum; x++) {
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
            this.onresize();
        });
        this.onresize();
    }

    onresize() {
        $("#filebrowser").height($("#sidenav").height());
    }

    /**
     * Finds all menu tabs and creates handlers.
     */
    initializeButtonHandlers() {
        // Handles Menu tab switching
        for (let x = 0; x < this.topButtons.length; x++) {
            $(this.topButtons[x]).click(
                this.menuTabClick(
                    this.topButtons[x], x, true
                )
            );
        }
    }

    toggleSideNav() {
        const element = document.getElementById("sidenav");
        let transVal = "";

        if (this.menuOpen === false) {
            transVal = "0";
            this.menuOpen = true;
        } else {
            transVal = String(-this.menuWidth);
            this.menuOpen = false;
        }

        element.style.transform = "translate(" + transVal + "px)";
    }

    showSideNav() {
        if (!this.menuOpen) {
            this.toggleSideNav();
        }
    }

    hideSideNav() {
        if (this.menuOpen) {
            this.toggleSideNav();
        }
    }

    /**
     * Determines which tab should be in view when clicked.
     *
     * @param {HTMLElement|string} it - The element
     * @param {number} posNum - Which tab it corresponds to
     * @param {boolean} closeIfSelected - Whether to close the tab
     * @returns {function} Function to call on tab click
     */
    menuTabClick(it, posNum, closeIfSelected) {
        return () => {
            if ($(it).hasClass("deactivated")) {
                return;
            }
            if (closeIfSelected
                    && this.menuOpen
                    && $(it).hasClass("selected")) {
                this.hideSideNav();
                this.focusReset();
            } else {
                this.showSideNav();
                const element = document.getElementById("MenuContent");
                const transVal = String(-this.menuWidth * posNum);
                element.style.transform = "translate(" + transVal + "px)";
                this.focusReset();
                $(it).addClass("selected");
            }
        };
    }

    /**
     * Deselects all menu tabs.
     */
    focusReset() {
        this.topButtons.forEach(button => {
            $(button).removeClass("selected");
        });
    }

    /**
     * This lets you browse the files available on the server.
     */
    fileBrowser() {
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
    pdfModal() {
        this.modal.title("Export the layout to SVG");
        this.modal.textBody("Do you want to save the file?", "info");
        this.modal.footer("confirmSavepdf");
        this.modal.show();
    }

    /**
     * Export the graph data to the CSV in Downloads folder.
     */
    csvModal() {
        this.modal.title("Export the graph data to CSV");
        this.modal.textBody("Do you want to save the file?", "info");
        this.modal.footer("confirmSavecsv");
        this.modal.show();
    }

}
