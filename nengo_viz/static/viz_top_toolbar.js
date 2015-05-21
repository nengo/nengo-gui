VIZ.Toolbar = function(model_name) {
    console.assert(typeof model_name == 'string')

	var self = this;

	//Make sure the file opener is initially hidden
    $('#filebrowser').hide()

    //Create event listener to hide the file opener when the mouse leaves it
    $('#filebrowser').mouseleave(function(){$(this).hide(200)});

    //Create a menu object for the top toolbar (useful for closing other menus that are open when toolbar is clicked on)
    this.menu = new VIZ.Menu(this);

    sim.toolbar = this;

    //Create the top toolbar which is using Bootstrap styling
	var toolbar = document.createElement('ul');
	toolbar.className = 'nav nav-pills'

	var main = document.getElementById('main');
	main.appendChild(toolbar);
	
	//keep a reference to the toolbar element
	this.toolbar=toolbar;

	//Allow navigation of files on computer
	var open_file = document.createElement('input');
	main.appendChild(open_file)
	open_file.setAttribute('type', 'file');
	open_file.id = 'open_file'
	open_file.style.display = 'none';
	open_file.addEventListener('change', function(){self.file_name();});
	
    this.add_button('Open file', 'glyphicon glyphicon-folder-open', function(){self.file_browser()});
	this.add_button('Reset model layout', 'glyphicon glyphicon-retweet', function() {self.reset_model_layout()});
	this.add_button('Undo last', 'glyphicon glyphicon-backward', function() {});
    this.add_button('Config_modal', 'glyphicon glyphicon-cog', function() {self.start_modal();});
	
	var button = document.createElement('li');
	button.id = 'model_name';
	toolbar.appendChild(button);
	button.innerHTML = model_name;
	button.setAttribute("role", "presentation");	

	interact(toolbar)
		.on('tap', function(){
			self.menu.hide_any();
		});
};

// This opens up the pop up window that allows you to select the file to open
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

//This is run once a file is selected, trims the filename and sends it to the server.
VIZ.Toolbar.prototype.file_name = function() {
    var filename = document.getElementById('open_file').value;
    filename = filename.replace("C:\\fakepath\\", ""); 
    var msg = 'open' + filename;
    sim.ws.send(msg);
};

//Tells the server to reset the model layout to the default
//Accomplishes this by deleting the config file and reloading the script (ex. reloads basic.py)
VIZ.Toolbar.prototype.reset_model_layout = function () {
    sim.ws.send('reset');
}

// Adds an icon to the top toolbar, using a bootstrap glyphicon class as the icon class
// attaches the function that is passed into it
// names is shown on hover
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

// Takes a list of options from the server and an element in which it will place a checkbox menu
VIZ.Toolbar.prototype.launch_global_user_config_menu = function(option_list, modal_element) {
    console.assert(typeof option_list == 'object')
    console.assert(typeof modal_element == 'object')
	var self = this;

	for (var i = 0; i < option_list.length; i++) {
		modal_element.appendChild(this.create_config_item(i, option_list[i]));
	}

    //make the close button
	var close_button = document.createElement('button');
	close_button.setAttribute('type', 'button');
	close_button.class = 'btn btn-default';
	close_button.style.position = 'absolute';
	close_button.style.bottom = '0';
	close_button.innerHTML = 'Close';
	close_button.addEventListener('click', function () {self.close_modal()});
	modal_element.appendChild(close_button);

    return modal_element;
}

// creates a checkbox item that sends updates to the server when it is checked/unchecked
VIZ.Toolbar.prototype.create_config_item = function (name, text) {
		var options = {tag:'user_config' , data: []}
		for (var i = 0; i < answers.length; i++){
			options.data.push(answers[i].checked);
		}
		var msg = JSON.stringify(options);
		sim.ws.send(msg);
	return label;
};

// Function called by event handler in order to launch modal
// open_modal is called from sim_control messages listener 
// after request for config options is sent by server, 
VIZ.Toolbar.prototype.start_modal = function () {

    if (this.modalWrapper) {
        this.close_modal();
    }
    else{
        sim.ws.send('config')
    }
};

// Is called once an option list is received from server,
// Creates the modal elements and positions it on screen.
VIZ.Toolbar.prototype.open_modal = function(option_list) {
    console.assert(typeof option_list == 'object')

    this.modalWrapper = document.createElement('div');
    this.modalWindow = document.createElement('div');
    this.modalWrapper.id = 'modal_wrapper';
    this.modalWindow.id = 'modal_window';
    this.modalWindow.innerHTML = '<p>Config menu</p>';
    this.modalWrapper.appendChild(this.modalWindow);

    // Add it to the main page
    main.appendChild(this.modalWrapper);
    
    //Add the checkboxes element
    this.launch_global_user_config_menu(option_list, this.modalWindow);
    this.modalWrapper.className = "overlay";
    this.modalWindow.style.marginTop = (-this.modalWindow.offsetHeight) / 2 + "px";
    this.modalWindow.style.marginLeft = (-this.modalWindow.offsetWidth) / 2 + "px";
};

// Closes the modal and removes it from the screen
VIZ.Toolbar.prototype.close_modal = function() {
        this.modalWrapper.parentNode.removeChild(this.modalWrapper);
        this.modalWrapper = false;
};
