var aceRange = ace.require('ace/range').Range;


Nengo.Ace = function (uid, args) {
    if (uid[0] === '<') {
        console.log("invalid uid for Ace: " + uid);
    }
    Nengo.ace = this;  // make a global pointing to this
    var self = this;
    this.hidden = false;
    this.min_width = 50;

    if (args.active === false) {
        $('#Toggle_ace').css('display', 'none');
        $('#Save_file').css('display', 'none');
        $('#Font_increase').css('display', 'none');
        $('#Font_decrease').css('display', 'none');
        return;
    }

    this.ws = Nengo.create_websocket(uid);
    this.ws.onmessage = function(event) {self.on_message(event);}

    this.current_code = '';
    var code_div = document.createElement('div')
    code_div.id = 'editor'
    document.getElementsByTagName("BODY")[0].appendChild(code_div);
    this.editor = ace.edit('editor')
    this.editor.getSession().setMode("ace/mode/python");
    this.editor.gotoLine(1);
    this.marker = null;

    this.save_disabled = true;

    //Setup the button to toggle the code editor
    $('#Toggle_ace').on('click', function(){self.toggle_shown();});

    $('#Save_file').on('click', function(){self.save_file();});
    $('#Font_increase').on('click', function(){self.font_increase();});
    $('#Font_decrease').on('click', function(){self.font_decrease();});

    this.schedule_updates();

    this.set_font_size(12);
    this.width = 580;  // pixels needed to do 80 chars at 12pt font

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
    this.update_main_width();
}

//Send changes to the code to server every 100ms
Nengo.Ace.prototype.schedule_updates = function () {
    var self = this;
    setInterval(function () {
        var editor_code = self.editor.getValue();
        if (editor_code != self.current_code) {
            self.ws.send(JSON.stringify({code:editor_code, save:false}));
            self.current_code = editor_code;
            self.enable_save();
        }
    }, 100)
}

Nengo.Ace.prototype.set_font_size = function (font_size) {
    this.font_size = font_size;
    this.editor.setFontSize(font_size);
}

Nengo.Ace.prototype.font_increase = function () {
    this.set_font_size(this.font_size + 1);
}
Nengo.Ace.prototype.font_decrease = function () {
    if (this.font_size > 6) {
        this.set_font_size(this.font_size - 1);
    }
}

Nengo.Ace.prototype.save_file = function () {
    if (!($('#Save_file').hasClass('disabled'))) {
        var editor_code = this.editor.getValue();
        this.ws.send(JSON.stringify({code:editor_code, save:true}));
        this.disable_save();
    }
}

Nengo.Ace.prototype.enable_save = function () {
    $('#Save_file').removeClass('disabled');
}

Nengo.Ace.prototype.disable_save = function () {
    $('#Save_file').addClass('disabled');
}

Nengo.Ace.prototype.on_message = function (event) {
    var msg = JSON.parse(event.data)
    if (msg.code !== undefined) {
        this.editor.setValue(msg.code);
        this.current_code = msg.code;
        this.editor.gotoLine(1);
        this.set_width();
        this.disable_save();
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

Nengo.Ace.prototype.show_editor = function () {
    var editor = document.getElementById('editor');
    editor.style.display = 'block';
    this.hidden = false;
}

Nengo.Ace.prototype.hide_editor = function () {
    var editor = document.getElementById('editor');
    editor.style.display = 'none';
    this.hidden = true;
}

Nengo.Ace.prototype.toggle_shown = function () {
    if (this.hidden) {
        this.show_editor();
    }
    else{
        this.hide_editor();
    }
    this.set_width();
}

Nengo.Ace.prototype.set_width = function () {
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
    code_div.style.left = left_margin;

    this.update_main_width();
}

Nengo.Ace.prototype.update_main_width = function () {
    var width = this.hidden ? 0 : this.width;
    var left_margin = $(window).width() - width;

    $('#main').width(left_margin);

    if (Nengo.netgraph !== undefined){
        Nengo.netgraph.svg.style.width = left_margin;
        Nengo.netgraph.on_resize();
    }
    viewport.on_resize();
}
