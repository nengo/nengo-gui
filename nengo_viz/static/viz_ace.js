var aceRange = ace.require('ace/range').Range;


VIZ.Ace = function (script_code, uid) {
	var self = this;
	this.hidden = false;
	this.min_width = 50;

	this.ws = VIZ.create_websocket(uid);
	this.ws.onmessage = function(event) {self.on_message(event);}

	this.current_code = script_code;
	var code_div = document.createElement('div')
	code_div.id = 'editor'
	document.getElementsByTagName("BODY")[0].appendChild(code_div);
	this.editor = ace.edit('editor')
	this.editor.getSession().setMode("ace/mode/python");
	this.editor.setValue(script_code);
	this.editor.gotoLine(1);
    this.marker = null;

	$('#Toggle_ace').on('click', function(){self.toggle_shown();});

	this.schedule_updates();

	this.width = $(window).width() / 5;

	self.set_width();	

	interact('#editor')
		.resizable({
			edges: { left: true, right: false, bottom: false, top: false}
		})
		.on('resizemove', function (event) {
			var x = event.deltaRect.left;
			self.width -= x;
			self.set_width()
		})
	$(window).on('resize', function() {self.set_width(); });
}

//Send changes to the code to server every 100ms 
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

VIZ.Ace.prototype.on_message = function (event) {
	var msg = JSON.parse(event.data)
    if (msg.code !== undefined) {
        this.editor.setValue(msg.code);
    } else if (msg.error === null) {
        if (this.marker !== null) {
            this.editor.getSession().removeMarker(this.marker);
            this.marker = null;
            this.editor.getSession().clearAnnotations();
        }
    } else if (msg.error !== undefined) {
        var line = msg.error.line;
        var trace = msg.error.trace;
        this.marker = this.editor.getSession()
            .addMarker(new aceRange(line - 1, 0, line - 1, 10), 
            'highlight', 'fullLine', true);
        this.editor.getSession().setAnnotations([{
            row: line - 1,
            type: 'error',
            text: trace,
        }]);
    } else {
        console.log(msg);
    }
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
	this.editor.resize();


	var code_div = document.getElementById('editor');
	
	if (this.width < this.min_width) {
		this.width = this.min_width;
	}

	this.max_width = $(window).width() - 100;

	if (this.width > this.max_width){
		this.width = this.max_width;
	}
	//Set the positioning of the code_div
	var top_margin = $(toolbar.toolbar).height();
	var bottom_margin = $(sim.div).height();
	var left_margin = $(window).width() - this.width;

	code_div.style.top = top_margin;
	code_div.style.bottom = bottom_margin;
	code_div.style.left = left_margin ; //Positions code editor so it takes up the right 20% of the screen.

	$('#main').width(left_margin)

	if (VIZ.netgraph !== undefined){
		VIZ.netgraph.on_resize();
		viewport.on_resize()
	}
	
}
