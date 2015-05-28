
VIZ.Ace = function (args, script_code) {
	var self = this;
	this.hidden = false;
	this.ws = VIZ.create_websocket(42) //to be args.uid
	var code_div = document.createElement('div')
	code_div.id = 'editor'
	document.getElementsByTagName("BODY")[0].appendChild(code_div);
	var editor = ace.edit('editor')
	editor.setTheme('ace/theme/monokai')
	editor.getSession().setMode("ace/mode/python");


	//TODO: ensure that VIZ.Ace is called after the sim control is built
	setTimeout(function(){
	editor.getSession().on('change', function() {
    	sim.ws.send(editor.getValue());
    	console.log(editor.getValue());
	});}, 10);


	editor.setValue('texxxxxxxxxxxxxxxxxxxxxxxtt\nHiodsahfjiodsjfio');

	var top_margin = $(toolbar.toolbar).height();

	var bottom_margin = $(sim.div).height();

	var left_margin = $(window).width();

	code_div.style.top = top_margin;
	code_div.style.bottom = bottom_margin;
	code_div.style.left = left_margin * 4 / 5; //Positions code editor so it takes up the right 20% of the screen.
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
