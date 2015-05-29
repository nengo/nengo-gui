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

    // TODO: hookup undo and redo
    // $('#Undo_last_button')[0].addEventListener('click', function () {});
    // $('#Redo_last_button')[0].addEventListener('click', function () {});
    $('#Config_button')[0].addEventListener('click', function () {self.start_modal()});

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
 *  First check to make sure modal isn't open already, then send
 *  call to server to generate modal javascript from config. */
VIZ.Toolbar.prototype.start_modal = function () {
    sim.ws.send('config')
};
