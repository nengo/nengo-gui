import * as $ from "jquery";

import { config } from "./config";
import { Sidebar } from "./sidebar";
import { FilebrowserView } from "./views/sidebar";
import { Connection } from "./server";

export class Filebrowser extends Sidebar {
    private attached: Connection[] = [];

    view: FilebrowserView;

    constructor() {
        super();
        this.view = new FilebrowserView();
        this.syncWithServer();

        document.addEventListener("nengoConfigChange", (event: CustomEvent) => {
            const key = event.detail;
            if (key === "scriptdir") {
                this.syncWithServer();
            }
        });
    }

    attach(conn: Connection) {
        this.attached.push(conn);
    }

    syncWithServer() {
        this.attached.forEach(conn => {
            conn.send("filebrowser.browse");
        });
        $(this.view.root).fileTree({
            script: "/browse?root=" + config.scriptdir,
            root: config.scriptdir,
        }, file => {
            window.location.assign("/?filename=" + file);
        });
    }
}
