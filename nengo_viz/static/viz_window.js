/*This detects if the mouse has exited the browser window to prevent erratic behaviour upon re-entry*/
window.addEventListener('load',
    function(e){
        var main = document.getElementById('netgraph');
        main.addEventListener('mouseout',
            function(e) {
                if (!(e)) {
                    e = window.event;
                }
                var from = e.relatedTarget || e.toElement;
                if (!from || from.nodeName == "HTML") {
                    $(main).trigger('mouseup'); // When the mouse leaves the #netgraph element, trigger the mouseup event
                    //console.log($('#netgraph')[0]) // When the mouse leaves the element, trigger the mouseup event
                    VIZ.net = $('#netgraph')[0];
                }
            }
            )
    }
);