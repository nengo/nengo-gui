
VIZ.Ace = function (args, script_code) {
	var self = this;
	this.hidden = false;
	this.min_width = 50;
	//this.ws = VIZ.create_websocket(42) //to be args.uid
	var code_div = document.createElement('div')
	code_div.id = 'editor'
	document.getElementsByTagName("BODY")[0].appendChild(code_div);
	var editor = ace.edit('editor')
	editor.setTheme('ace/theme/monokai')
	editor.getSession().setMode("ace/mode/python");

	//Setup the button to toggle the code editor
	$('#Toggle_ace').on('click', function(){self.toggle_shown();});

	//TODO: ensure that VIZ.Ace is called after the sim control is built
	setTimeout(function(){
	editor.getSession().on('change', function(event) {
    	sim.ws.send(editor.getValue());
    	console.log(editor.getValue() === '', event);
	});}, 10);

	
	this.width = $(window).width() / 5;
	this.set_width();

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
		this.show_editor();
	}
	else{
		this.hide_editor();
	}
}

VIZ.Ace.prototype.set_width = function () {
	var code_div = document.getElementById('editor');
	//Set the positioning of the code_div
	var top_margin = $(toolbar.toolbar).height();
	var bottom_margin = $(sim.div).height();
	
	if (this.width < this.min_width) {
		this.width = this.min_width;
	}
	var left_margin = $(window).width() - this.width;


	code_div.style.top = top_margin;
	code_div.style.bottom = bottom_margin;
	code_div.style.left = left_margin ; //Positions code editor so it takes up the right 20% of the screen.
}