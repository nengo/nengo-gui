/*This detects if the mouse has exited the browser window to prevent erratic behaviour upon re-entry*/
window.addEventListener('load',
    function(e){
        var main = document.getElementById('main');
        main.addEventListener('mouseout',
            function(e) {
                if (!(e)) {
                    e = window.event;
                }
                var from = e.relatedTarget || e.toElement;
                if (!from || from.nodeName == "HTML") {
                    $(main).trigger('mouseup'); // When the mouse leaves the #main element, trigger the mouseup event
                }
            }
            )
    }
);