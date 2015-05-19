VIZ.Modal = {};

VIZ.Modal.show = function() {
    this.sim_was_running = !sim.paused;
    $('.modal').first().modal('show');
    sim.pause()
}

$('.modal').first().on('hidden.bs.modal', function () {
    if (VIZ.Modal.sim_was_running) {
        sim.play();
    }
})

VIZ.Modal.title = function(title) {
    $('.modal-title').first().text(title);
}

VIZ.Modal.footer = function(type){
    var $footer = $('.modal-footer').first();
    $footer.empty();

    if (type === "close") {
        $footer.append('<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>');
    } else {
        console.warn('Modal footer type ' + type + ' no recognized.')
    }
}

VIZ.Modal.ensemble_body = function(params, siminfo, connections) {
    var $body = $('.modal-body').first();
    $body.empty();

    $body.append('<ul class="nav nav-tabs">'+
                 '  <li class="active"><a href="#params" data-toggle="tab">Parameters</a></li>'+
                 '  <li><a href="#plots" data-toggle="tab">Plots</a></li>'+
                 '  <li><a href="#connections" data-toggle="tab">Connections</a></li>'+
                 '</ul>');

    var $content = $('<div class="tab-content"/>').appendTo($body);

    // Parameters
    var $params = $('<div class="tab-pane active" id="params"/>')
        .appendTo($content);
    var $plist = $('<dl class="dl-horizontal"/>').appendTo($params);
    for (var i = 0; i < params.length; i++) {
        $plist.append('<dt>' + params[i][0] + '</dt>')
            .append('<dd>' + params[i][1] + '</dd>');
    }

    // Plots
    var $plots = $('<div class="tab-pane" id="plots"/>').appendTo($content);
    $plots.text("Plots");

    // Connections
    var $connections = $('<div class="tab-pane" id="connections"/>')
        .appendTo($content);
    $connections.text("Connections");
}
