
VIZ.Ace = function (script_code, uid) {
	var self = this;
	this.hidden = true;
	this.min_width = 50;
	this.ws = VIZ.create_websocket(uid);
	this.current_code = script_code;
	var code_div = document.createElement('div')
	code_div.id = 'editor'
	document.getElementsByTagName("BODY")[0].appendChild(code_div);
	this.editor = ace.edit('editor')
	this.editor.setTheme('ace/theme/monokai')
	this.editor.getSession().setMode("ace/mode/python");
	this.editor.setValue(script_code);

	//Setup the button to toggle the code editor
	$('#Toggle_ace').on('click', function(){self.toggle_shown();});

	//TODO: ensure that VIZ.Ace is called after the sim control is built
	this.schedule_updates();

	this.width = $(window).width() / 5;

	//needs to wait to enure that the sim object is created
	setTimeout(function(){
		self.set_width();}, 1);	

	interact('#editor')
		.resizable({
			edges: { left: true, right: false, bottom: false, top: false}
		})
		.on('resizemove', function (event) {
			var x = event.deltaRect.left;
			self.width -= x;
			self.set_width()
		})
	$(window).on('resize', function() {self.set_width()});
}

//Send changes to the code every 100ms 
VIZ.Ace.prototype.schedule_updates = function () {
	var self = this;
	setInterval(function () {
		var editor_code = self.editor.getValue();
		if (editor_code != self.current_code) {
			self.ws.send(editor_code);
			self.current_code = editor_code;
		}
	}, 100)
}

VIZ.Ace.prototype.show_editor = function () {
	var editor = document.getElementById('editor');
	editor.style.display = 'block';
	this.hidden = false;
}

VIZ.Ace.prototype.hide_editor = function () {
	var editor = document.getElementById('editor');
	editor.style.display = 'none';
	this.hidden = true;
}

VIZ.Ace.prototype.toggle_shown = function () {
	if (this.hidden) {
		this.set_width();
		this.show_editor();
	}
	else{
		this.hide_editor();
	}
}

VIZ.Ace.prototype.set_width = function () {
	var code_div = document.getElementById('editor');
	
	if (this.width < this.min_width) {
		this.width = this.min_width;
	}
	//Set the positioning of the code_div
	var top_margin = $(toolbar.toolbar).height();
	var bottom_margin = $(sim.div).height();
	var left_margin = $(window).width() - this.width;

	code_div.style.top = top_margin;
	code_div.style.bottom = bottom_margin;
	code_div.style.left = left_margin ; //Positions code editor so it takes up the right 20% of the screen.
}