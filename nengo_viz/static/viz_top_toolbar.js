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

    /** Create the top toolbar which is using Bootstrap styling */
    var toolbar = document.createElement('ul');
    toolbar.className = 'nav nav-pills'
    
    /** keep a reference to the toolbar element */
    this.toolbar=toolbar;

    this.add_button('Open file', 'glyphicon glyphicon-folder-open', 
            function(){self.file_browser()});
    this.add_button('Reset model layout', 'glyphicon glyphicon-retweet', 
            function() {self.reset_model_layout()});
    this.add_button('Undo last', 'glyphicon glyphicon-backward', 
            function() {}); //TODO: hookup undo
    this.add_button('Redo last', 'glyphicon glyphicon-forward', 
            function() {}); //TODO: hookup redo 
    this.add_button('Config_modal', 'glyphicon glyphicon-cog', 
            function() {self.start_modal();});
    
    var button = document.createElement('li');
    button.id = 'filename';
    button.innerHTML = filename;
    button.setAttribute("role", "presentation");
    toolbar.appendChild(button);

    this.menu = new VIZ.Menu(toolbar);

    interact(toolbar).on('tap', function(){
        self.menu.hide_any();
    });

    main.appendChild(toolbar);
};

/** 
 * Adds a button to the top toolbar, 
 * {string} name - name of button, shown on hover
 * {string} icon_class - bootstrap glyphicon class
 * {function} function - called when button pressed
 */
VIZ.Toolbar.prototype.add_button = function (name, icon_class, fun) {
    console.assert(typeof name == 'string')
    console.assert(typeof icon_class == 'string')
    console.assert(typeof fun == 'function')
    
    var button = document.createElement('li');
    var link = document.createElement('a');
    link.setAttribute('title', name);
    button.appendChild(link);
    this.toolbar.appendChild(button);
    link.className = icon_class;
    button.setAttribute("role", "presentation");
    button.addEventListener('click', function() {fun();});
}

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
