/**
 * Toolbar for the top of the GUI.
 *
 * Toolbar constructor is written into HTML file by python and called
 * upon page load.
 *
 * @constructor
 * @param {string} filename - The name of the file opened
 */

require('./top_toolbar.css');
var interact = require('interact.js');
var menu = require('./menu');

var Toolbar = function(filename, sim) {
    console.assert(typeof filename === 'string');

    var self = this;
    self.sim = sim;
    self.modal = self.sim.modal;
    self.modal.toolbar = this; // TODO: remove this hack
    self.netgraph = self.modal.netgraph;
    self.hotkeys = self.modal.hotkeys;
    self.editor = self.modal.editor;
    self.config = self.netgraph.config;

    var main = document.getElementById('main');

    $('#Reset_layout_button')[0].addEventListener('click', function() {
        self.modal.title("Are you sure you wish to reset this layout, " +
                         "removing all the graphs and resetting the position " +
                         "of all items?");
        self.modal.text_body("This operation cannot be undone!", "danger");
        self.modal.footer('confirm_reset');
        self.modal.show();
    });

    $('#Undo_last_button')[0].addEventListener('click', function() {
        self.netgraph.notify({undo: "1"});
    });
    $('#Redo_last_button')[0].addEventListener('click', function() {
        self.netgraph.notify({undo: "0"});
    });
    $('#Config_button')[0].addEventListener('click', function() {
        self.config_modal();
    });
    $('#Sync_editor_button')[0].addEventListener('click', function() {
        self.editor.update_trigger = true;
    });
    $('#Help_button')[0].addEventListener('click', function() {
        self.hotkeys.callMenu();
    });
    $('#filename')[0].addEventListener('click', function() {
        self.save_as();
    });

    $('#filename')[0].innerHTML = filename;

    // Update the URL so reload and bookmarks work as expected
    history.pushState({}, filename, '/?filename=' + filename);

    this.toolbar = $('#toolbar_object')[0];

    this.menu = new menu.Menu(this.toolbar);

    interact(toolbar).on('tap', function() {
        menu.hide_any();
    });
};

/**
 * Trims the filename and sends it to the server.
 */
Toolbar.prototype.file_name = function() {
    var filename = document.getElementById('open_file').value;
    filename = filename.replace("C:\\fakepath\\", "");
    this.sim.ws.send('open' + filename);
};

/**
 * Reset the model layout to the default.
 *
 * This is done by deleting the config file and reloading the script.
 */
Toolbar.prototype.reset_model_layout = function() {
    window.location.assign(
        '/?reset=True&filename=' + $("#filename")[0].innerHTML);
};

/**
 * Launch the config modal.
 *
 * This is done by calling the server to call config_modal_show with config data.
 */
Toolbar.prototype.config_modal = function() {
    // Doing it this way in case we need to save options to a file later
    this.sim.ws.send('config');
};

Toolbar.prototype.config_modal_show = function() {
    var self = this;

    // Get current state in case user clicks cancel
    var original = {zoom: self.netgraph.zoom_fonts,
                    font_size: self.netgraph.font_size,
                    aspect_resize: self.netgraph.aspect_resize,
                    auto_update: self.editor.auto_update,
                    transparent_nets: self.netgraph.transparent_nets,
                    scriptdir: self.config.scriptdir};

    self.modal.title('Configure Options');
    self.modal.main_config();
    self.modal.footer('ok_cancel', function(e) {
        var zoom = $('#zoom-fonts').prop('checked');
        var font_size = $('#config-fontsize').val();
        var fixed_resize = $('#fixed-resize').prop('checked');

        var modal = $('#myModalForm').data('bs.validator');
        modal.validate();
        if (modal.hasErrors() || modal.isIncomplete()) {
            return;
        }
        $('#OK').attr('data-dismiss', 'modal');
    }, function() { // Cancel_function
        self.netgraph.zoom_fonts = original.zoom;
        self.netgraph.font_size = original.font_size;
        self.netgraph.transparent_nets = original.transparent_nets;
        self.netgraph.aspect_resize = original.aspect_resize;
        self.editor.auto_update = original.auto_update;
        self.config.scriptdir = original.scriptdir;
        $('#cancel-button').attr('data-dismiss', 'modal');
    });

    var $form = $('#myModalForm').validator({
        custom: {
            my_validator: function($item) {
                var num = $item.val();
                return (num.length <= 3 && num > 20);
            }
        },
    });

    self.modal.show();
};

Toolbar.prototype.save_as = function() {
    var self = this;
    self.modal.title("Save file as");
    self.modal.clear_body();

    var filename = $('#filename')[0].innerHTML;

    var $form = $('<form class="form-horizontal" id ' +
        '="myModalForm"/>').appendTo(self.modal.$body);
    $('<div class="form-group" id="save-as-group">' +
        '<input type="text" id="save-as-filename" class="form-control" ' +
               'value="' + filename + '"/>' +
      '</div>').appendTo($form);

    self.modal.footer('ok_cancel', function() {
        var save_as_filename = $('#save-as-filename')[0].value;
        if (save_as_filename !== filename) {
            var editor_code = self.editor.editor.getValue();
            self.editor.ws.send(JSON.stringify(
                {code: editor_code, save: true, save_as: save_as_filename}
            ));
        }
    });
    $('#OK').attr('data-dismiss', 'modal');
    $("#save-as-filename").keypress(function(event) {
        if (event.which == 13) {
            event.preventDefault();
            $('#OK').click();
        }
    });
    self.modal.show();
};

module.exports = Toolbar;
