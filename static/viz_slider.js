
VIZ.Slider = function(args) {
    VIZ.WSComponent.call(this, args);
    
    this.scale = d3.scale.linear();
    this.scale.domain([-1, 1]);
    this.scale.range([0, args.height]);
    
    var self = this;
    
    this.sliders = [];
    for (var i = 0; i < args.n_sliders; i++) {
        var slider = {};
        this.sliders.push(slider);
        
        slider.index = i;
        slider.div = document.createElement('div');
        slider.value = 0;
        slider.div.style.position = 'fixed';
        slider.div.classList.add('slider');
        this.div.appendChild(slider.div);
        slider.div.slider = slider;
        
        interact(slider.div)
            .draggable({
                    onmove: function (event) {
                    var target = event.target,
                        // keep the dragged position in the data-x/data-y attributes
                        x = (parseFloat(target.getAttribute('data-x')) || 0);
                        y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                    if (y > self.scale.range()[1]) {
                        y = self.scale.range()[1];
                    }
                    if (y < self.scale.range()[0]) {
                        y = self.scale.range()[0];
                    }
                    // translate the element
                    target.style.webkitTransform =
                        target.style.transform =
                        'translate(' + x + 'px, ' + (y-25) + 'px)';

                    // update the position attributes
                    target.setAttribute('data-y', y);
                      
                    var slider = target.slider;  
                    var old_value = slider.value;
                    var new_value = self.scale.invert(y);
                    if (new_value != old_value) {
                        slider.value = new_value;
                        self.ws.send('' + slider.index + ',' + new_value);
                    }
                }
            })
        
    
    }
    this.on_resize(args.width, args.height);
    
};

VIZ.Slider.prototype = Object.create(VIZ.WSComponent.prototype);
VIZ.Slider.prototype.constructor = VIZ.Slider;


VIZ.Slider.prototype.on_resize = function(width, height) {
    var N = this.sliders.length
    this.scale.range([0, height]);
    for (var i in this.sliders) {
        var slider = this.sliders[i];
        slider.div.style.width = width / N;
        slider.div.style.height = 50;   
        var x = i * width /N;
        var y = this.scale(slider.value);
        slider.div.setAttribute('data-x', x);
        slider.div.setAttribute('data-y', y);
        slider.div.style.webkitTransform = 
            slider.div.style.transform = 'translate(' + x + 'px, ' + (y-25) + 'px)';
    }
};
