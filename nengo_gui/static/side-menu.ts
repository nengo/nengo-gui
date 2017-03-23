/**
 * Menu for the side of the GUI.
 *
 * SideMenu constructor is written into HTML file by python and called
 * upon page load.
 */

import * as $ from "jquery";

import * as allComponents from "./components/all-components";
import { config } from "./config";
import "./side-menu.css";
import { AlertDialogView } from "./views/modal";

export class SideMenu {
    menuOpen;
    menuWidth;
    netgraph;
    sim;
    tabs;
    topButtons;

    constructor (sim) {
        let fileBrowserOpen = false;
        this.sim = sim;
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
            this.svgModal();
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
    svgModal() {
        const modal = new AlertDialogView("Do you want to save the SVG file?");
        modal.title = "Export the layout to SVG";

        const save = modal.addFooterButton("Save");
        save.addEventListener("click", () => {
            // TODO: without jquery
            const svg = $("#main svg")[0];

            // Serialize SVG as XML
            const svgXml = (new XMLSerializer()).serializeToString(svg);
            let source = "<?xml version='1.0' standalone='no'?>" + svgXml;
            source = source.replace("&lt;", "<");
            source = source.replace("&gt;", ">");

            const svgUri = "data:image/svg+xml;base64," + btoa(source);

            // Extract filename from the path
            // TODO: without jquery
            const path = $("#filename")[0].textContent;
            let filename = path.split("/").pop();
            filename = filename.split(".")[0];

            // Initiate download
            const link = document.createElement("a");
            // Experimental future feature; uncomment when finalized.
            // link.download = filename + ".svg";
            link.href = svgUri;

            // Adding element to the DOM (needed for Firefox)
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            $(modal).modal("hide");
        });
        modal.show();
    }

    /**
     * Export the graph data to the CSV in Downloads folder.
     */
    csvModal() {
        const modal = new AlertDialogView("Do you want to save the CSV file?");
        modal.title = "Export the graph data to CSV";

        const save = modal.addFooterButton("Save");
        save.addEventListener("click", () => {
            // TODO: remove jquery

            const csv = allComponents.toCSV();
            // Extract filename from the path
            const path = $("#filename")[0].textContent;
            let filename = path.split("/").pop();
            filename = filename.split(".")[0];

            const uri =
                "data:text/csv;charset=utf-8," + encodeURIComponent(csv);

            const link = document.createElement("a");
            link.href = uri;
            link.style.visibility = "hidden";
            // Experimental future feature; uncomment when finalized.
            // link.download = filename + ".csv";
            // Adding element to the DOM (needed for Firefox)
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            $(modal).modal("hide");
        });
        modal.show();
    }

}
