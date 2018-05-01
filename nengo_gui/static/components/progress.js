Nengo.Progress = function (args) {
    var self = this;
    this.ws = Nengo.create_websocket(args.uid);
    this.ws.onmessage = function(event) { self.on_message(event); }
};

Nengo.Progress.prototype.on_message = function(event) {
    var data = JSON.parse(event.data);
    var progress = document.getElementById('build-progress');
    var text;

    if (data.finished) {
        text = data.name_after + ' finished in ' + data.elapsed_time + '.';
    } else if (data.max_steps === null) {
        text = data.name_during + '&hellip; duration: ' + data.elapsed_time;
    } else {
        text = data.name_during + '&hellip; ' +
            (100 * data.progress).toFixed(0) + '%, ETA: ' + data.eta;
    }

    progress.getElementsByClassName('pb-text')[0].innerHTML = text;

    var fill = progress.getElementsByClassName('pb-fill')[0]
    if (data.max_steps === null) {
        fill.style.width = '100%';
        fill.style.animation = 'pb-fill-anim 2s linear infinite';
        fill.style.backgroundSize = '100px 100%';
        fill.style.backgroundImage = 'repeating-linear-gradient(' +
            '90deg, #bdd2e6, #edf2f8 40%, #bdd2e6 80%, #bdd2e6)';
    } else {
        if (data.progress > 0) {
            fill.style.transition = 'width 0.1s linear';
        } else {
            fill.style.transition = 'none';
        }
        fill.style.width = (100 * data.progress) + '%';
        fill.style.animation = 'none';
        fill.style.backgroundImage = 'none';
    }

    if (data.finished) {
        fill.style.animation = 'none';
        fill.style.backgroundImage = 'none';
    }
};
