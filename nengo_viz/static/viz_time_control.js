
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
    
    this.rate_div = document.createElement('div');
    div.appendChild(this.rate_div);
    this.ticks_div = document.createElement('div');
    div.appendChild(this.ticks_div);
    
};

VIZ.TimeControl.prototype.on_message = function(event) {
    var msg = event.data;
    if (msg.substring(0,6) == 'ticks:') {
        this.ticks = parseInt(msg.substring(6));
        this.ticks_div.innerHTML = 'Tick: ' + this.ticks;
    } else if (msg.substring(0,5) == 'rate:') {
        this.rate = parseFloat(msg.substring(5));
        this.rate_div.innerHTML='Speed: ' + this.rate + 'x';
    }
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
