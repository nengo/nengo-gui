VIZ.Toolbar = function(model_name) {
	var self = this;

	//Make sure the file opener is initially hidden
    $('#filebrowser').hide()

    //Create event listener to hide the file opener when the mouse leaves it
    $('#filebrowser').mouseleave(function(){$(this).hide(200)});

    //Create a menu object for the top toolbar (useful for closing other menus that are open when toolbar is clicked on)
    this.menu = new VIZ.Menu(this);

    //Create the top toolbar which is using Bootstrap styling
	var toolbar = document.createElement('ul');
	toolbar.className = 'nav nav-pills'
	//VIZ.top_bar = toolbar;
	var main = document.getElementById('main');
	//VIZ.set_transform(toolbar, 0,0)
	main.appendChild(toolbar);
	
	//keep a reference to the toolbar element
	this.toolbar=toolbar;

	//Keep an array representing user setting configuration
	this.array_settings;

	//Allow navigation of files on computer
	var open_file = document.createElement('input');
	main.appendChild(open_file)
	open_file.setAttribute('type', 'file');
	open_file.id = 'open_file'
	open_file.style.display = 'none';
	open_file.addEventListener('change', function(){console.log('swiss chz');self.file_name();});
	this.add_button('Open file', 'glyphicon glyphicon-folder-open', function(){self.file_browser()});
	this.add_button('Reset model layout', 'glyphicon glyphicon-retweet', function() {self.reset_model_layout()});
	this.add_button('Undo last', 'glyphicon glyphicon-backward', function() {});
	
	var button = document.createElement('li');
	button.id = 'model_name';
	toolbar.appendChild(button);
	button.innerHTML = model_name;
	button.setAttribute("role", "presentation");	

	interact(toolbar)
		.on('tap', function(){
			self.menu.hide_any();
		});

	VIZ.Toolbar.launch_global_user_config_menu();

	var name = document.createElement('li');
	name.id = 'model_name';
	name.innerHTML = model_name;
	name.setAttribute("role", "presentation");	
	VIZ.top_bar.appendChild(name);

    var modalWrapper = document.getElementById("modal_wrapper");
    var modalWindow  = document.getElementById("modal_window");

    var openModal = function(e) {
       modalWrapper.className = "overlay";
       modalWindow.style.marginTop = (-modalWindow.offsetHeight)/2 + "px";
       modalWindow.style.marginLeft = (-modalWindow.offsetWidth)/2 + "px";
       e.preventDefault ? e.preventDefault() : e.returnValue = false;
    };
}

// This opens up the pop up window that allows you to select the file to open
VIZ.Toolbar.prototype.file_browser = function () {
	//this.menu.hide_any()
    sim.ws.send('browse');

    fb = $('#filebrowser');
    fb.toggle(200);
    if (fb.is(":visible")) {
        fb.fileTree({
            root: '.',
            script: '/browse'
        }, function (file) {
                var msg = 'open' + file
                sim.ws.send(msg);})
    }
};

//This is run once a file is selected, trims the filename and sends it to the server.
VIZ.Toolbar.prototype.file_name = function() {
    var filename = document.getElementById('open_file').value;
    filename = filename.replace("C:\\fakepath\\", ""); 
    var msg = 'open' + filename 
        sim.ws.send(msg);
};

//Tells the server to reset the model layout to the default
//Accomplishes this by deleting the config file and reloading the script (ex. reloads basic.py)
VIZ.Toolbar.prototype.reset_model_layout = function () {
    sim.ws.send('reset');
}

VIZ.Toolbar.prototype.add_button = function (name, icon_class, fun) {
    var button = document.createElement('li');
    var link = document.createElement('a');
    link.setAttribute('title', name);
    button.appendChild(link);
    this.toolbar.appendChild(button);
	link.className = icon_class;
	button.setAttribute("role", "presentation");
	button.addEventListener('click', function() {fun();});
}

VIZ.Toolbar.add_dropdown = function(){}

//<button type="button" class="btn btn-default">Default</button>

VIZ.Toolbar.launch_global_user_config_menu = function() {

	var menu = document.createElement('div');
	menu.id = 'global_config_menu';
	main = document.getElementById('main');
	main.appendChild(menu);
	menu.appendChild(create_config_item(1, 'scroll behaviour', 'box1, plz clik'));
	menu.appendChild(create_config_item(2, 'scroll behaviour', 'box2, plz clik'));
	menu.appendChild(create_config_item(3, 'scroll behaviour', 'box3, plz clik'));
	menu.appendChild(create_config_item(4, 'scroll behaviour', 'box4, plz clik'));

	var close_button = document.createElement('button');
	close_button.setAttribute('type', 'button');
	close_button.class = 'btn btn-default';
	close_button.style.position = 'absolute';
	close_button.style.bottom = '0';
	close_button.innerHTML = 'hallo';
	menu.appendChild(close_button);
}

function create_config_item(name, text) {
	//<input type="checkbox" name="vehicle" value="Bike">
	var label = document.createElement('label');
	var option = document.createElement('input');
	label.innerHTML = text;
	option.setAttribute('class', 'config_option');
	label.appendChild(option);
	option.type = 'checkbox';
	option.name = name;
	option.value = name;
	option.addEventListener('click', function() {
		var answers = $('.config_option');
		console.log(answers)
		var options = {tag:'user_config' , data: []}//.each(function(item){console.log(item)});
		for (var i = 0; i < answers.length; i++){
			options.data.push(answers[i].checked)
		}
		console.log(options)
		var msg = JSON.stringify(options);
		console.log(msg)
	})
	return label;
}
