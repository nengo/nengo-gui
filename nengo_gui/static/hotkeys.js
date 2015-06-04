Nengo.Hotkeys = function () {
    var self = this;

    document.addEventListener('keydown', function(ev) {
        if (typeof ev.key != 'undefined') {
            var key = ev.key;
        } else {
            switch (ev.keyCode) {
                case 191:
                    var key = '?';
                    break;
                default:
                    var key = String.fromCharCode(ev.keyCode)
            }
        }
        var key = key.toLowerCase();
        var ctrl = ev.ctrlKey || ev.metaKey;

        // toggle editor with ctrl-e
        if (ctrl && key == 'e') {
            Nengo.ace.toggle_shown();
            ev.preventDefault();
        }
        // undo with ctrl-z
        if (ctrl && key == 'z') {
            Nengo.netgraph.notify({ undo: "1" });
            ev.preventDefault();
        }
        // redo with shift-ctrl-z
        if (ctrl && ev.shiftKey && key == 'z') {
            Nengo.netgraph.notify({ undo: "0" });
            ev.preventDefault();
        }
        // redo with ctrl-y
        if (ctrl && key == 'y') {
            Nengo.netgraph.notify({ undo: "0" });
            ev.preventDefault();
        }
        // run model with spacebar
        if (key == ' ') {
            if (!ev.repeat) {
                sim.on_pause_click();
            }
            ev.preventDefault();
        }
        // bring up help menu with ?
        if (key == '?') {
            self.callMenu();
            ev.preventDefault();
        }
        // bring up minimap with ctrl-m
        if (ctrl && key == 'm') {
            Nengo.netgraph.toggleMiniMap();
            ev.preventDefault();
        }
    });
}

Nengo.Hotkeys.prototype.callMenu = function () {
    Nengo.modal.title("Hotkeys list");
    Nengo.modal.help_body();
    Nengo.modal.show();
}

Nengo.hotkeys = new Nengo.Hotkeys();
