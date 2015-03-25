/**
 * Network diagram connection line
 * @constructor
 *
 * @param {VIZ.NetGraph} ng - The containing VIZ.NetGraph
 * @param {dict} info - A set of constructor arguments, including:
 * @param {string} info.uid - A unique identifier
 * @param {string or null} info.parent - A containing NetGraphItem
 * @param {array of strings} info.pre - uid to connect from and its parents
 * @param {array of strings} info.post - uid to connect to and its parents
 */
VIZ.NetGraphConnection = function(ng, info) {
    this.ng = ng;
    this.uid = info.uid;

    if (info.parent == null) {
        this.parent = null;
    } else {
        this.parent = ng.svg_objects[info.parent];
        this.parent.children.push(this);
    }
    this.expanded = false;
    this.pres = info.pre;
    this.posts = info.post;

    this.removed = false;

    this.pre = null;
    this.post = null;

    this.set_pre(this.find_pre());
    this.set_post(this.find_post());

    this.line = ng.createSVGElement('line');
    
    this.g = ng.createSVGElement('g');
    this.g.appendChild(this.line);
    
    this.marker = ng.createSVGElement('path');
    this.marker.setAttribute('d', "M 10 0 L -5 -5 L -5 5 z");
    this.g.appendChild(this.marker);

    this.redraw();

    ng.g_conns.appendChild(this.g);

}

VIZ.NetGraphConnection.prototype.set_pre = function(pre) {
    if (this.pre != null) {
        var index = this.pre.conn_out.indexOf(this);
        if (index == -1) {
            console.log('error removing in set_pre');
        }
        this.pre.conn_out.splice(index, 1);    
    }
    this.pre = pre;
    this.pre.conn_out.push(this);
}

VIZ.NetGraphConnection.prototype.set_post = function(post) {
    if (this.post != null) {
        var index = this.post.conn_in.indexOf(this);
        if (index == -1) {
            console.log('error removing in set_pre');
        }
        this.post.conn_in.splice(index, 1);    
    }
    this.post = post;
    this.post.conn_in.push(this);
}

VIZ.NetGraphConnection.prototype.find_pre = function() {
    for (var i in this.pres) {
        var pre = this.ng.svg_objects[this.pres[i]];
        if (pre != undefined) {
            return pre;
        } else {
            this.ng.register_conn(this, this.pres[i]);
        }
    }
    console.log('could not find pre');
    console.log(this.pres);
}

VIZ.NetGraphConnection.prototype.find_post = function() {
    for (var i in this.posts) {
        var post = this.ng.svg_objects[this.posts[i]];
        if (post != undefined) {
            return post;
        } else {
            this.ng.register_conn(this, this.posts[i]);
        }
    }
    console.log('could not find post');
    console.log(this.posts);
}

VIZ.NetGraphConnection.prototype.remove = function() {
    if (this.parent != null) {
        var index = this.parent.children.indexOf(this);
        if (index == -1) {
            console.log('error removing in remove');
        }
        this.parent.children.splice(index, 1);    
    }
    this.ng.g_conns.removeChild(this.g);
    this.removed = true;

    delete this.ng.svg_conns[this.uid];    
}

VIZ.NetGraphConnection.prototype.redraw = function() {
    var pre_pos = this.pre.get_screen_location();
    var post_pos = this.post.get_screen_location();
    this.line.setAttribute('x1', pre_pos[0]);
    this.line.setAttribute('y1', pre_pos[1]);
    this.line.setAttribute('x2', post_pos[0]);
    this.line.setAttribute('y2', post_pos[1]);
    
    var mx = pre_pos[0] * 0.4 + post_pos[0] * 0.6;
    var my = pre_pos[1] * 0.4 + post_pos[1] * 0.6;
    var angle = 180 / Math.PI * Math.atan2(post_pos[1] - pre_pos[1], 
                                           post_pos[0] - pre_pos[0]);
    this.marker.setAttribute('transform', 
                        'translate(' + mx + ',' + my + ') rotate('+angle+')');
}
