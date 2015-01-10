
VIZ.TimeControl = function(args) {
    var div = this.div = document.createElement('div');
    div.classList.add('graph');
    args.parent.appendChild(div);
    div.classList.add('time_control');    
    
    this.height = div.clientHeight;
    console.log(this.height);

    this.paused = false;
    this.built = false;
    
    this.id = args.id;
    var self = this;
    
    this.ws = new WebSocket('ws://localhost:8080/viz_component?id=' + this.id);
    this.ws.onmessage = function(event) {self.on_message(event);}

    var self = this;
    this.pause_button = document.createElement('button');
    this.pause_button.innerHTML='Pause';
    this.pause_button.onclick = function(event) {self.on_pause_click();};
    
    div.appendChild(this.pause_button);
};

VIZ.TimeControl.prototype.on_message = function(event) {
    console.log(event.data);
};

VIZ.TimeControl.prototype.on_pause_click = function(event) {
    if (this.paused) {
        this.ws.send('continue');
        this.paused = false;
        this.pause_button.innerHTML = 'Pause';
    } else {
        this.ws.send('pause');
        this.paused = true;
        this.pause_button.innerHTML = 'Continue';
    }
};
