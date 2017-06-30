/**
 * Initializes hotkeys
 * @constructor
 *
 * Nengo.Hotkeys is called when this file is loaded
 */
Nengo.Hotkeys = function () {
    var self = this;

    this.active = true;
    
    document.addEventListener('keydown', function(ev) {
        if (self.active) {

            var is_editable = (ev.target.tagName === 'INPUT' ||
                ev.target.tagName == 'TEXTAREA');

            if (typeof ev.key != 'undefined') {
                var key = ev.key;
            } else {
                switch (ev.keyCode) {
                    case 191:
                        var key = '?';
                        break;
                    case 8:
                        var key = 'backspace';
                        break;
                    case 13:
                        var key = 'enter';
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
            // save with save-s
            if (ctrl && key == 's') {
                Nengo.ace.save_file();
                ev.preventDefault();
            }
            // run model with spacebar or with shift-enter
            if ((key == ' ' && !is_editable) ||
                    (ev.shiftKey && key == 'enter')) {
                if (!ev.repeat) {
                    sim.on_pause_click();
                }
                ev.preventDefault();
            }
            // bring up help menu with ?
            if (key == '?' && !is_editable) {
                self.callMenu();
                ev.preventDefault();
            }
            // bring up minimap with ctrl-m
            if (ctrl && key == 'm') {
                Nengo.netgraph.toggleMiniMap();
                ev.preventDefault();
            }
            // disable backspace navigation
            if (key == 'backspace' && !is_editable) {
                ev.preventDefault();
            }
            // toggle auto-updating with TODO: pick a good shortcut
            if (ctrl && ev.shiftKey && key == '1') {
                Nengo.ace.auto_update = !Nengo.ace.auto_update;
                Nengo.ace.update_trigger = Nengo.ace.auto_update;
                ev.preventDefault();
            }
            // trigger a single update with TODO: pick a good shortcut
            if (ctrl && !ev.shiftKey && key == '1') {
                Nengo.ace.update_trigger = true;
                ev.preventDefault();
            }
        }
    });
}

Nengo.Hotkeys.prototype.callMenu = function () {
    Nengo.modal.title("Hotkeys list");
    Nengo.modal.footer('close');
    Nengo.modal.help_body();
    Nengo.modal.show();
}
 
//Set active is provided with a boolean argument, which will either
//turn the hotkeys on or off
Nengo.Hotkeys.prototype.set_active = function(bool) {
    console.assert(typeof(bool) == 'boolean')
    this.active = bool;
}

Nengo.hotkeys = new Nengo.Hotkeys();
