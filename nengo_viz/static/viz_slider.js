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

        /** Show the slider Value */
        var valueDisplay = document.createElement('p');
        valueDisplay.innerHTML = slider.value;
        slider.div.appendChild(valueDisplay);

        slider.div.style.position = 'fixed';
        slider.div.classList.add('slider');
        this.div.appendChild(slider.div);
        slider.div.slider = slider;


      
        /** make the slider draggable */
        /** Only allows dragging slider while mouse is over it */
        var drag_on = function () {
            this.draggable = true;
            VIZ.dragging_obj = this;
        };

        var drag_off = function () {
            setTimeout(function () {
                VIZ.dragging_obj.draggable = false;
            },
                5);
        };         

        slider.div.addEventListener('mouseover', drag_on);
        this.div.addEventListener('mouseleave',drag_off);
        slider.div.addEventListener('touchenter',drag_on);
        this.div.addEventListener('touchleave',drag_off)

        /** Slider jumps to zero when middle clicked */
        /** TODO: Replicate this functionality for touch */
        slider.div.addEventListener("click", 
            function(event) {
                /** check if click was the middle mouse button */
                if (event.which == 2) {
                    
                    var target = this;

                    var slider_index = target.slider.index; // Get index (For 1D > sliders)
                    var x_pos = target.getAttribute('data-x'); //important for 2d sliders
                    var midpoint = self.scale.range()[1]/2 ;// Calculate the middle pixel value
                    var new_value = self.scale.invert(midpoint);// Convert to scaled value (should be 0)
                    var height = parseInt(target.style.height);//Get the slider height

                    //Change shown text value to 0
                    target.firstChild.innerHTML = 0;

                    //Change sliders value to 0
                    target.slider.value = 0;

                    // Set sliders attributed position to the middle
                    target.setAttribute('data-y', midpoint);

                    //Move the slider to the middle, subtract half slider height due to pixel offset
                    VIZ.set_transform(target, x_pos, midpoint - height/2);

                    //Send update to the server
                    self.ws.send(slider_index + ',' + new_value);
                }
            }
        );

        /** setup slider dragging */
        interact(slider.div)
            .draggable({
                onmove: function (event) {
                    var target = event.target;
                    if (target.draggable){

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

                        /** only show slider value to 2 decimal places */
                        target.firstChild.innerHTML = new_value.toFixed(2); 

                        if (new_value != old_value) {
                            target.slider.value = new_value;
                            self.ws.send(target.slider.index + ',' + new_value);
                        }
                    }
                }
            });
    }
    this.on_resize(args.width, args.height);
};
VIZ.Slider.prototype = Object.create(VIZ.Component.prototype);
VIZ.Slider.prototype.constructor = VIZ.Slider;

/**
 * update visual display based when component is resized
 */
VIZ.Slider.prototype.on_resize = function(width, height) {
    var N = this.sliders.length;
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
