/**
 * A slider to adjust Node values
 * @constructor
 *
 * @params {dict} args - a set of constructor arguments (see VIZ.Component)
 * @params {int} args.n_sliders - the number of sliders to show
 */
VIZ.Slider = function(args) {
    VIZ.Component.call(this, args);
    var self = this;
    
    /** a scale to map from values to pixels */
    this.scale = d3.scale.linear();
    this.scale.domain([1,  -1]);
    this.scale.range([0, args.height]);
    
    /** number of pixels high for the slider itself */
    this.slider_height = 50;
    
    /** make the sliders */
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
        
        /** make the slider draggable */
        interact(slider.div)
            .draggable({
                onmove: function (event) {
                    var target = event.target
                    /** load x and y from custom data-x/y attributes */ 
                    var x = parseFloat(target.getAttribute('data-x'));
                    var y = parseFloat(target.getAttribute('data-y')) + 
                                                                     event.dy;

                    /** bound y to within the limits 
                     * TODO: perhaps use interact.js limit system instead
                     */
                    if (y > self.scale.range()[1]) {
                        y = self.scale.range()[1];
                    }
                    if (y < self.scale.range()[0]) {
                        y = self.scale.range()[0];
                    }

                    VIZ.set_transform(target, x, y - self.slider_height / 2);

                    /** remember where we moved to */
                    target.setAttribute('data-y', y);
                      
                    /** update the value and send it to the server */
                    var old_value = target.slider.value;
                    var new_value = self.scale.invert(y);
                    if (new_value != old_value) {
                        target.slider.value = new_value;
                        self.ws.send(target.slider.index + ',' + new_value);
                    }
                }
            })
    }
    this.on_resize(args.width, args.height);
};
VIZ.Slider.prototype = Object.create(VIZ.Component.prototype);
VIZ.Slider.prototype.constructor = VIZ.Slider;

/**
 * update visual display based when component is resized
 */
VIZ.Slider.prototype.on_resize = function(width, height) {
    var N = this.sliders.length
    this.scale.range([0, height]);
    for (var i in this.sliders) {
        var slider = this.sliders[i];
        /** figure out the size of the slider */
        slider.div.style.width = width / N;
        slider.div.style.height = this.slider_height;

        /** figure out the position of the slider */   
        var x = i * width / N;
        var y = this.scale(slider.value);
        VIZ.set_transform(slider.div, x, y - this.slider_height / 2);

        /** store the x and y locations for use in dragging */
        slider.div.setAttribute('data-x', x);
        slider.div.setAttribute('data-y', y);
    }
};
