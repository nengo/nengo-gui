/*<ul class="nav nav-pills ">
   <li role="presentation" class="dropdown">
    <a class="dropdown-toggle" data-toggle="dropdown" href="#" role="button" aria-expanded="false">
      File
    </a>
    <ul class="dropdown-menu" role="menu">
      Save
    </ul>
  </li>



<input type="file" id="theFile" />

<li role="presentation"><a href="#">Messages</a></li>

</ul>
*/

function performClick(elemId) {
	console.log('clikpreformer')
   var elem = document.getElementById(elemId);
   console.log(elem.value)
   if(elem && document.createEvent) {
      var evt = document.createEvent("MouseEvents");
      evt.initEvent("click", true, false);
      elem.dispatchEvent(evt);
   }
}

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
	VIZ.Toolbar.add_button('Open file', 'glyphicon glyphicon-folder-open', function(){performClick('open_file')});

	VIZ.Toolbar.add_button('Reset model layout', 'glyphicon glyphicon-retweet', function() {performClick('openFile')});

	VIZ.Toolbar.add_button('Save as', 'glyphicon glyphicon-floppy-disk', function() {performClick('openFile')});
}

VIZ.Toolbar.prototype.onmessage = function(msg) {
	console.log(msg);
}

VIZ.Toolbar.prototype.file_name = function() {
	if (!(this.ws)) {
		this.ws = sim.ws;
		this.ws.onmessage = function(event) {self.on_message(event);}
	}

	var filename = document.getElementById('open_file').value;
	filename = filename.replace("C:\\fakepath\\", ""); 
	var msg = JSON.stringify({tag:'open', data:'filename'});
	this.ws.send(msg);
	console.log('sent ' + msg);
};

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
