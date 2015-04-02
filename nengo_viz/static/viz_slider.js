/**
 * A slider to adjust Node values
 * @constructor
 *
 * @params {dict} args - a set of constructor arguments (see VIZ.Component)
 * @params {int} args.n_sliders - the number of sliders to show
 */
VIZ.Slider = function(parent, args) {
    VIZ.Component.call(this, parent, args);
    var self = this;

    VIZ.set_transform(this.label, 0, -30);
 
    /** a scale to map from values to pixels */
    this.scale = d3.scale.linear();
    this.scale.domain([args.max_value,  args.min_value]);
    this.scale.range([0, args.height]);
    
    /** number of pixels high for the slider itself */
    this.slider_height = 30;
    self.minHeight = 40;
    
    /** make the sliders */
    this.sliders = [];
    for (var i = 0; i < args.n_sliders; i++) {
        var slider = {};
        this.sliders.push(slider);
        
        slider.index = i;
        slider.div = document.createElement('button');
        slider.div.className = 'btn btn-default';
        slider.div.style.padding = '5px 0px';
        slider.div.style.borderColor = '#666';
        
        slider.value = args.start_value[i];

        /** Show the slider Value */
        var valueDisplay = document.createElement('p');
        valueDisplay.classList.add('unselectable')
        valueDisplay.innerHTML = slider.value;
        slider.div.appendChild(valueDisplay);

        /** put the slider in the container */
        slider.div.style.position = 'fixed';
        this.div.appendChild(slider.div);
        slider.div.style.zIndex = 1;
        slider.div.slider = slider;

        /** Slider jumps to zero when middle clicked */
        /** TODO: Replicate this functionality for touch */
        slider.div.addEventListener("click", 
            function(event) {
                /** check if click was the middle mouse button */
                if (event.which == 2){
                    self.set_value(this.slider.index, 0);
                }
            }
        );

        /** setup slider dragging */
        interact(slider.div)
            .draggable({
                onmove: function (event) {
                    var target = event.target;

                    /** load x and y from custom data-x/y attributes */ 
                    var x = parseFloat(target.getAttribute('fixed-x'));
                    var y = parseFloat(target.getAttribute('drag-y')) +
                                                                     event.dy;

                    /** store the actual drag location without bounds */
                    target.setAttribute('drag-y', y);
                    /** bound y to within the limits */
                    if (y > self.scale.range()[1]) {
                        y = self.scale.range()[1];
                    }
                    if (y < self.scale.range()[0]) {
                        y = self.scale.range()[0];
                    }

                    VIZ.set_transform(target, x, y - self.slider_height / 2);
                      
                    /** update the value and send it to the server */
                    var old_value = target.slider.value;
                    
                    var new_value = self.scale.invert(y);

                    /** only show slider value to 2 decimal places */
                    target.firstChild.innerHTML = new_value.toFixed(2); 

                    if (new_value != old_value) {
                        target.slider.value = new_value;
                        self.ws.send(target.slider.index + ',' + new_value);
                    }
                },
                onend: function(event){
                    var target = event.target;

                    var y = parseFloat(target.getAttribute('drag-y'));

                    /** important to keep these conditions seperate from above, otherwise
                    *   sliders will get out of synch
                    */
                    if (y > self.scale.range()[1]) {
                        target.setAttribute('drag-y', self.scale.range()[1]);
                    }
                    if (y < self.scale.range()[0]) {
                        target.setAttribute('drag-y', self.scale.range()[0]);
                    }
                }
            });
    }

    this.guideline_width = 7;
    for (var i = 0; i<args.n_sliders;i++){
        /** show the guideline */
        var guideline = document.createElement('div');
        this.sliders[i].guideline = guideline;
        guideline.classList.add('guideline');
        guideline.style.position = "fixed";
        //subtract 2 from height for border
        guideline.style.height = args.height - 2;
        guideline.style.width = this.guideline_width;
        //Good for positioning regardless of # of sliders
        var guide_x = args.width / (2 * args.n_sliders) + 
            (args.width / args.n_sliders) * i - this.guideline_width / 2;
        VIZ.set_transform(guideline, guide_x, 0);
        this.div.appendChild(guideline);
        }

    this.on_resize(args.width, args.height);
};


VIZ.Slider.prototype = Object.create(VIZ.Component.prototype);
VIZ.Slider.prototype.constructor = VIZ.Slider;

VIZ.Slider.prototype.set_value = function(slider_index, value) {
    //Get the slider
    var target = this.sliders[slider_index].div;

    //important for 2d sliders
    var x_pos = target.getAttribute('fixed-x'); 
    
    //Get the scaled value
    var point = this.scale(value);

    //Get the slider height
    var height = this.slider_height;

    //Change shown text value to new value
    target.firstChild.textContent = value;

    //Change slider's value to value
    target.slider.value = value;

    //Set sliders attributed position to the middle
    target.setAttribute('drag-y', point);

    //Move the slider to the middle, subtract half slider height due to pixel offset
    VIZ.set_transform(target, x_pos, point - height / 2);

    //Send update to the server
    this.ws.send(slider_index + ',' + value);
};

/**
 * update visual display based when component is resized
 */
VIZ.Slider.prototype.on_resize = function(width, height) {
    var self = this;
    if (width < self.minWidth) {
        width = self.minWidth;
    }
    if (height < self.minHeight) {
        height = self.minHeight;
    };
    
    VIZ.resize.general(self, width, height);

    var N = this.sliders.length;
    this.scale.range([0, height]);
    for (var i in this.sliders) {
        var slider = this.sliders[i];
        /** figure out the size of the slider */
        slider.div.style.width = width / N - 3;
        slider.div.style.height = this.slider_height;

        //subtract 2 from height for border
        slider.guideline.style.height = height - 2;

        var guide_x = width / (2 * N) + (width / N) * i 
            - this.guideline_width / 2;

        VIZ.set_transform(slider.guideline, guide_x, 0);

        /** figure out the position of the slider */   
        var x = i * width / N;
        var y = this.scale(slider.value);
        VIZ.set_transform(slider.div, x, y - this.slider_height / 2);

        /** store the x and y locations for use in dragging */
        slider.div.setAttribute('fixed-x', x);
        slider.div.setAttribute('drag-y', y);
    } 
    
};


VIZ.Slider.prototype.generate_menu = function() {
    var self = this;
    var items = [];
    items.push(['set range', function() {self.set_range();}]);

    // add the parent's menu items to this
    // TODO: is this really the best way to call the parent's generate_menu()?
    return $.merge(items, VIZ.Component.prototype.generate_menu.call(this));
};

VIZ.Slider.prototype.set_range = function() {
    var range = this.scale.domain();
    var new_range = prompt('Set range', '' + range[1] + ',' + range[0]);
    if (new_range !== null) {
        new_range = new_range.split(',');
        var min = parseFloat(new_range[1]);
        var max = parseFloat(new_range[0]);
        this.scale.domain([min, max]);
        this.save_layout();
    }
    for (var i in this.sliders) {
        this.set_value(i,this.sliders[i].value); 
    }
};

VIZ.Slider.prototype.layout_info = function () {
    var info = VIZ.Component.prototype.layout_info.call(this);
    info.min_value = this.scale.domain()[1];
    info.max_value = this.scale.domain()[0];
    return info;
};
