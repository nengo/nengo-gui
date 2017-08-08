/**
 * Toolbar for the top of the GUI
 * @constructor
 *
 * @param {string} filename - The name of the file opened
 *
 * Toolbar constructor is written into HTML file by python and called
 * upon page load
 */
Nengo.Toolbar = function(filename) {
    console.assert(typeof filename== 'string')

    var self = this;

    var main = document.getElementById('main');

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
    $('#Config_button')[0].addEventListener('click', function () {
        self.config_modal();
    });
    $('#Sync_editor_button')[0].addEventListener('click', function () {
        Nengo.ace.update_trigger = true;
    });
    $('#Help_button')[0].addEventListener('click', function () {
        Nengo.hotkeys.callMenu();
    });
    $('#filename')[0].addEventListener('click', function () {
        self.save_as();
    });

    $('#filename')[0].innerHTML = filename;

    // update the URL so reload and bookmarks work as expected
    history.pushState({}, filename, '/?filename=' + filename);

    this.toolbar = $('#toolbar_object')[0];

    this.menu = new Nengo.Menu(this.toolbar);

    interact(toolbar).on('tap', function(){
        self.menu.hide_any();
    });
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
    window.location.assign('/?reset=True&filename=' + $("#filename")[0].innerHTML);
}

/** Function called by event handler in order to launch modal.
 *  call to server to call config_modal_show with config data. */
Nengo.Toolbar.prototype.config_modal = function () {
    sim.ws.send('config');  //Doing it this way in case we need to save options to a file later
}

Nengo.Toolbar.prototype.config_modal_show = function() {
    var self = this;

    // Get current state in case user clicks cancel
    var original = {zoom: Nengo.netgraph.zoom_fonts,
                    font_size: Nengo.netgraph.font_size,
                    aspect_resize: Nengo.netgraph.aspect_resize,
                    auto_update: (typeof Nengo.ace != 'undefined') ? Nengo.ace.auto_update : false,
                    transparent_nets: Nengo.netgraph.transparent_nets,
                    scriptdir: Nengo.config.scriptdir};

    Nengo.modal.title('Configure Options');
    Nengo.modal.main_config();
    Nengo.modal.footer('ok_cancel', function(e) {
        var zoom = $('#zoom-fonts').prop('checked');
        var font_size = $('#config-fontsize').val();
        var fixed_resize = $('#fixed-resize').prop('checked');

        var modal = $('#myModalForm').data('bs.validator');
        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        $('#OK').attr('data-dismiss', 'modal');
    },
        function () {  //cancel_function
            Nengo.netgraph.zoom_fonts = original["zoom"];
            Nengo.netgraph.font_size = original["font_size"];
            Nengo.netgraph.transparent_nets = original["transparent_nets"];
            Nengo.netgraph.aspect_resize = original["aspect_resize"];
            if (typeof Nengo.ace != 'undefined') {
                Nengo.ace.auto_update = original["auto_update"];
            }
            Nengo.config.scriptdir = original["scriptdir"];
            $('#cancel-button').attr('data-dismiss', 'modal');
    });

    var $form = $('#myModalForm').validator({
        custom: {
            my_validator: function($item) {
                var num = $item.val();
                return (num.length<=3 && num>20);
            }
        },
    });

    Nengo.modal.show();
};

Nengo.Toolbar.prototype.save_as = function () {
    var self = this;
    Nengo.modal.title("Save file as");
    Nengo.modal.clear_body();

    var filename = $('#filename')[0].innerHTML;

    var $form = $('<form class="form-horizontal" id ' +
        '="myModalForm"/>').appendTo(Nengo.modal.$body);
    $('<div class="form-group" id="save-as-group">' +
        '<input type="text" id="save-as-filename" class="form-control" ' +
               'value="' + filename + '"/>' +
      '</div>').appendTo($form);

    Nengo.modal.footer('ok_cancel', function() {
        var save_as_filename = $('#save-as-filename')[0].value;
        if (save_as_filename !== filename) {
            var editor_code = Nengo.ace.editor.getValue();
            Nengo.ace.ws.send(JSON.stringify({code:editor_code, save:true,
                                              save_as:save_as_filename}));
        }
    });
    $('#OK').attr('data-dismiss', 'modal');
    $("#save-as-filename").keypress(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            $('#OK').click();
        }
    });
    Nengo.modal.show();
}
