VIZ.Hotkeys = function () { 
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

        // undo with ctrl-z
        if (ctrl && key == 'z') {
            VIZ.netgraph.notify({ undo: "1" });
            ev.preventDefault();
        }
        // redo with shift-ctrl-z
        if (ctrl && ev.shiftKey && key == 'z') {
            VIZ.netgraph.notify({ undo: "0" });
            ev.preventDefault();
        }
        // redo with ctrl-y
        if (ctrl && key == 'y') {
            VIZ.netgraph.notify({ undo: "0" });
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
    });
}

VIZ.Hotkeys.prototype.callMenu = function () {
        VIZ.modal.title("Hotkeys list");
        VIZ.modal.help_body();
        VIZ.modal.show();
}

VIZ.hotkeys = new VIZ.Hotkeys();
