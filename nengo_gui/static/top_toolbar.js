/**
 * Toolbar for the top of the GUI
 * @constructor
 *
 * @param {string} filename - The name of the file opened
 */
Nengo.Toolbar = function(filename) {
    console.assert(typeof filename== 'string')

    var self = this;

    var main = document.getElementById('main');

    /** Make sure the file opener is initially hidden */
    $('#filebrowser').hide()
    /** Create event listener to hide file opener when the mouse leaves */
    $('#filebrowser').mouseleave(function(){$(this).hide(200)});

    $('#Open_file_button')[0].addEventListener('click', function () {
        if (!$(this).hasClass('deactivated')) {
            self.file_browser();
        }
    });
    $('#Reset_layout_button')[0].addEventListener('click', function () {
        Nengo.modal.title("Are you sure you wish to reset this layout, " +
                        "removing all the graphs and resetting the position " +
                        "of all items?");
        Nengo.modal.text_body("This operation cannot be undone!", "danger");
        Nengo.modal.footer('confirm_reset');
        Nengo.modal.show();
    });

    $('#Undo_last_button')[0].addEventListener('click', function() {
        Nengo.netgraph.notify({ undo: "1" });
    });
    $('#Redo_last_button')[0].addEventListener('click', function () {
        Nengo.netgraph.notify({ undo: "0" });
    });
    $('#Minimap_button')[0].addEventListener('click', function () {
        Nengo.netgraph.toggleMiniMap();
    });
    $('#Config_button')[0].addEventListener('click', function () {
        self.config_modal();
    });
    $('#Help_button')[0].addEventListener('click', function () {
        Nengo.hotkeys.callMenu();
    });

    $('#filename')[0].innerHTML = filename;

    this.toolbar = $('#toolbar_object')[0];

    this.menu = new Nengo.Menu(this.toolbar);

    interact(toolbar).on('tap', function(){
        self.menu.hide_any();
    });
};

/** This lets you browse the files available on the server */
Nengo.Toolbar.prototype.file_browser = function () {
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
Nengo.Toolbar.prototype.file_name = function() {
    var filename = document.getElementById('open_file').value;
    filename = filename.replace("C:\\fakepath\\", "");
    sim.ws.send('open' + filename);
};

/** Tells the server to reset the model layout to the default,
 *  by deleting the config file and reloading the script */
Nengo.Toolbar.prototype.reset_model_layout = function () {
    sim.ws.send('reset');
}

/** Function called by event handler in order to launch modal.
 *  call to server to call config_modal_show with config data. */
Nengo.Toolbar.prototype.config_modal = function () {
    sim.ws.send('config');  //Doing it this way in case we need to save options to a file later
}

Nengo.Toolbar.prototype.config_modal_show = function() {
    var self = this;

    var options = [Nengo.netgraph.get_zoom_fonts(),
        Nengo.netgraph.get_font_size()];

    Nengo.modal.title('Configure Options');
    Nengo.modal.main_config(options);
    Nengo.modal.footer('ok_cancel', function(e) {
        var zoom = $('#zoom-fonts').prop('checked');
        var font_size = $('#config-fontsize').val();
        var modal = $('#myModalForm').data('bs.validator');

        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        Nengo.netgraph.set_zoom_fonts(zoom);
        Nengo.netgraph.set_font_size(parseInt(font_size));
        $('#OK').attr('data-dismiss', 'modal');
    },
        function () {  //cancel_function
            Nengo.netgraph.set_zoom_fonts(options[0]);
            Nengo.netgraph.set_font_size(options[1]);
            $('#cancel-button').attr('data-dismiss', 'modal');
    });

    var $form = $('#myModalForm').validator({
        custom: {
            my_validator: function($item) {
                var num = $item.val();
                return (num.length<=3 && num>10);
            }
        },
    });

    Nengo.modal.show();
};
