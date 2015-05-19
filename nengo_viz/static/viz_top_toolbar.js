



VIZ.Toolbar = function() {
	

	var self = this;

	var toolbar = document.createElement('ul');
	toolbar.className = 'nav nav-pills'
	VIZ.top_bar = toolbar;
	var main = document.getElementById('main');
	main.appendChild(toolbar);
	
	//Allow navigation of files on computer
	var open_file = document.createElement('input');
	main.appendChild(open_file)
	open_file.setAttribute('type', 'file');
	open_file.id = 'open_file'
	open_file.style.display = 'none';
	open_file.addEventListener('change', function(){console.log('swiss chz');self.file_name();});
	VIZ.Toolbar.add_button('Open file', 'glyphicon glyphicon-folder-open', function(){self.file_browser()});

	VIZ.Toolbar.add_button('Reset model layout', 'glyphicon glyphicon-retweet', function() {self.reset_model_layout()});

	VIZ.Toolbar.add_button('Save as', 'glyphicon glyphicon-floppy-disk', function() {});
}

// This opens up the pop up window that allows you to select the file to open
VIZ.Toolbar.prototype.file_browser =function () {
   var elem = document.getElementById('open_file');
   console.log(elem.value)
   if(elem && document.createEvent) {
      var evt = document.createEvent("MouseEvents");
      evt.initEvent("click", true, false);
      elem.dispatchEvent(evt);
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

VIZ.Toolbar.add_button = function (name, icon_class, fun) {
	var button = document.createElement('li');
	var link = document.createElement('a');
	link.setAttribute('title', name);
	button.appendChild(link);
	VIZ.top_bar.appendChild(button);
	link.className = icon_class;
	button.setAttribute("role", "presentation");
	button.addEventListener('click', function() {fun();});
}

VIZ.Toolbar.add_dropdown = function(){}

new VIZ.Toolbar();
