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
	var toolbar = document.createElement('ul');
	toolbar.className = 'nav nav-pills'
	VIZ.top_bar = toolbar;
	var main = document.getElementById('main');
	main.appendChild(toolbar);
	
	//Allow navigation of files on computer
	var open_file = document.createElement('input');
	main.appendChild(open_file)
	open_file.setAttribute('type', 'file');
	open_file.id = 'openFile'
	open_file.style.display = 'block';
	VIZ.Toolbar.add_button('Open file', 'glyphicon glyphicon-folder-open',  function() {performClick('openFile')});

	VIZ.Toolbar.add_button('Reset model layout', 'glyphicon glyphicon-retweet', function() {performClick('openFile')});

	VIZ.Toolbar.add_button('Save as', 'glyphicon glyphicon-floppy-disk', function() {performClick('openFile')});
	



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

VIZ.Toolbar();
