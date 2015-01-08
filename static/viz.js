var VIZ = {};

VIZ.Component = function(args) {
    var div = document.createElement('div');
    div.style.width = args.width;
    div.style.height = args.height;
    div.style.webkitTransform = 
        div.style.transform = 'translate(' + args.x + 'px, ' + args.y + 'px)';
    div.setAttribute('data-x', args.x);
    div.setAttribute('data-y', args.y);
    div.style.position = 'fixed';
    
    div.classList.add('graph');
    args.parent.appendChild(div);
    this.div = div;
    
    var self = this;
    
    interact(div)
        .draggable({
            inertia: true,
            restrict: {
                restriction: "parent",
                endOnly: true,
                elementRect: {top: 0, left: 0, bottom: 1, right: 1 }
            },
            onmove: function (event) {
                var target = event.target,
                    // keep the dragged position in the data-x/data-y attributes
                    x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                    y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                // translate the element
                target.style.webkitTransform =
                    target.style.transform =
                    'translate(' + x + 'px, ' + y + 'px)';

                  // update the position attributes
                  target.setAttribute('data-x', x);
                  target.setAttribute('data-y', y);
            }
        })
        .resizable(true)
        .on('resizemove', function(event) {
            var target = event.target;

            // add the change in coords to the previous width of the target element
            var newWidth  = parseFloat(target.style.width ) + event.dx,
                newHeight = parseFloat(target.style.height) + event.dy;

            // update the element's style
            target.style.width  = newWidth + 'px';
            target.style.height = newHeight + 'px';
            
            self.on_resize(newWidth, newHeight);
        });    
};

VIZ.Component.prototype.on_resize = function(width, height) {};


VIZ.WSComponent = function(args) {
    VIZ.Component.call(this, args);
    this.id = args.id;
    var self = this;
    
    this.ws = new WebSocket('ws://localhost:8080/viz_component?id=' + this.id);
    this.ws.onmessage = function(event) {self.on_message(event);}
};
VIZ.WSComponent.prototype = Object.create(VIZ.Component.prototype);
VIZ.WSComponent.prototype.constructor = VIZ.WSComponent;

VIZ.WSComponent.prototype.on_message = function(event) {
};