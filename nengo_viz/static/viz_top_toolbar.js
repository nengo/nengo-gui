/**
 * Toolbar for the top of the GUI
 * @constructor
 *
 * @param {string} filename - The name of the file opened
 */
VIZ.Toolbar = function(filename) {
    console.assert(typeof filename== 'string')

    var self = this;

    var main = document.getElementById('main');

    /** Make sure the file opener is initially hidden */
    $('#filebrowser').hide()
    /** Create event listener to hide file opener when the mouse leaves */
    $('#filebrowser').mouseleave(function(){$(this).hide(200)});

    /** keep a reference to the toolbar element */
    this.toolbar = $('#top_toolbar')[0];

    $('#Open_file_button')[0].addEventListener('click', function () {
        self.file_browser();
    });
    $('#Reset_layout_button')[0].addEventListener('click', function () {
        VIZ.modal.title("Are you sure you wish to reset this layout, " +
                        "removing all the graphs and resetting the position " +
                        "of all items?");
        VIZ.modal.text_body("This operation cannot be undone!", "danger");
        VIZ.modal.footer('confirm_reset');
        VIZ.modal.show();
    });

    $('#Undo_last_button')[0].addEventListener('click', function() {
        VIZ.netgraph.notify({ undo: "1" });
    });
    $('#Redo_last_button')[0].addEventListener('click', function () {
        VIZ.netgraph.notify({ undo: "0" });
    });
    $('#Config_button')[0].addEventListener('click', function () {
        self.config_modal();
    });
    $('#Help_button')[0].addEventListener('click', function () {
        VIZ.hotkeys.callMenu();
    });
   
    $('#filename')[0].innerHTML = filename;

    this.menu = new VIZ.Menu(this.toolbar);

    interact(toolbar).on('tap', function(){
        self.menu.hide_any();
    });
};

/** This lets you browse the files available on the server */
VIZ.Toolbar.prototype.file_browser = function () {
    sim.ws.send('browse');

    fb = $('#filebrowser');
    fb.toggle(200);
    if (fb.is(":visible")) {
        fb.fileTree({
            root: '.',
            script: '/browse'
        },
        function (file) {
            var msg = 'open' + file
            sim.ws.send(msg);})
    }
};

/** This is run once a file is selected, trims the filename
 *  and sends it to the server. */
VIZ.Toolbar.prototype.file_name = function() {
    var filename = document.getElementById('open_file').value;
    filename = filename.replace("C:\\fakepath\\", "");
    sim.ws.send('open' + filename);
};

/** Tells the server to reset the model layout to the default,
 *  by deleting the config file and reloading the script */
VIZ.Toolbar.prototype.reset_model_layout = function () {
    sim.ws.send('reset');
}

/** Function called by event handler in order to launch modal.
 *  call to server to call config_modal_show with config data. */
VIZ.Toolbar.prototype.config_modal = function () {
    sim.ws.send('config');  //Doing it this way in case we need to save options to a file later
}

VIZ.Toolbar.prototype.config_modal_show = function(options) {
    var self = this;
    console.log(options); //Options are ignored for now

    options = [VIZ.netgraph.get_zoom_fonts(),
        VIZ.netgraph.get_font_size()];

    VIZ.modal.title('Configure Options');
    VIZ.modal.main_config(options);
    VIZ.modal.footer('ok_cancel', function(e) {
        var zoom = $('#zoom-fonts').prop('checked');
        var font_size = $('#config-fontsize').val();
        var modal = $('#myModalForm').data('bs.validator');

        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        VIZ.netgraph.set_zoom_fonts(zoom);
        VIZ.netgraph.set_font_size(parseInt(font_size));
        $('#OK').attr('data-dismiss', 'modal');
    });

    VIZ.modal.show();
};
