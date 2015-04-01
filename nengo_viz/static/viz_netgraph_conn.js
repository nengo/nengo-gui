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

    /** flag to indicate this Connection has been deleted */
    this.removed = false;

    /** the actual NetGraphItem currently connected to/from */
    this.pre = null;
    this.post = null;    
    
    /** the uids for the pre and post items in the connection
     *  The lists start with the ideal target item, followed by the parent
     *  of that item, and its parent, and so on.  If the first item on the
     *  this does not exist (due to it being inside a collapsed network),
     *  the connection will look for the next item on the list, and so on
     *  until it finds one that does exist. */
    this.pres = info.pre;
    this.posts = info.post;
    
    this.recurrent = this.pres[0] === this.posts[0];

    /** figure out the best available items to connect to */
    this.set_pre(this.find_pre());
    this.set_post(this.find_post());

    /** determine parent and add to parent's children list */
    if (info.parent === null) {
        this.parent = null;
    } else {
        this.parent = ng.svg_objects[info.parent];
        this.parent.child_connections.push(this);
    }
    
    /** create the line and its arrowhead marker */
    this.g = ng.createSVGElement('g');


    if (this.recurrent) {
        this.recurrent_ellipse = ng.createSVGElement('ellipse');
        this.recurrent_ellipse.setAttribute('class', 'recurrent');
        this.g.appendChild(this.recurrent_ellipse);
    } else {
        this.line = ng.createSVGElement('line');
        this.g.appendChild(this.line);    
    }
    
    this.marker = ng.createSVGElement('path');
    this.marker.setAttribute('d', "M 10 0 L -5 -5 L -5 5 z");
    this.g.appendChild(this.marker);
    

    this.redraw();

    ng.g_conns.appendChild(this.g);
}


/** set the item connecting from */
VIZ.NetGraphConnection.prototype.set_pre = function(pre) {
    if (this.pre !== null) {
        /** if we're currently connected, disconnect */
        var index = this.pre.conn_out.indexOf(this);
        if (index === -1) {
            console.log('error removing in set_pre');
        }
        this.pre.conn_out.splice(index, 1);    
    }
    this.pre = pre;
    /** add myself to pre's output connections list */
    this.pre.conn_out.push(this);
}


/** set the item connecting to */
VIZ.NetGraphConnection.prototype.set_post = function(post) {
    if (this.post !== null) {
        /** if we're currently connected, disconnect */
        var index = this.post.conn_in.indexOf(this);
        if (index === -1) {
            console.log('error removing in set_pre');
        }
        this.post.conn_in.splice(index, 1);    
    }
    this.post = post;
    /** add myself to post's input connections list */
    this.post.conn_in.push(this);
}


/** determine the best available item to connect from */
VIZ.NetGraphConnection.prototype.find_pre = function() {
    for (var i in this.pres) {
        var pre = this.ng.svg_objects[this.pres[i]];
        if (pre !== undefined) {
            return pre;
        } else {
            /** register to be notified if a better match occurs */
            this.ng.register_conn(this, this.pres[i]);
        }
    }
    console.log('could not find pre');
    console.log(this.pres);
}


/** determine the best available item to connect to */
VIZ.NetGraphConnection.prototype.find_post = function() {
    for (var i in this.posts) {
        var post = this.ng.svg_objects[this.posts[i]];
        if (post !== undefined) {
            return post;
        } else {
            /** register to be notified if a better match occurs */
            this.ng.register_conn(this, this.posts[i]);
        }
    }
    console.log('could not find post');
    console.log(this.posts);
}


/** remove this connection */
VIZ.NetGraphConnection.prototype.remove = function() {
    if (this.parent !== null) {
        var index = this.parent.child_connections.indexOf(this);
        if (index === -1) {
            console.log('error removing in remove');
        }
        this.parent.child_connections.splice(index, 1);    
    }
    this.ng.g_conns.removeChild(this.g);
    this.removed = true;

    delete this.ng.svg_conns[this.uid];    
}


/** redraw the connection */
VIZ.NetGraphConnection.prototype.redraw = function() {
    var pre_pos = this.pre.get_screen_location();
    
    if (this.recurrent) {
        var item = this.ng.svg_objects[this.pres[0]];
        if (item === undefined) {
            this.marker.setAttribute('visibility', 'hidden');
            this.recurrent_ellipse.setAttribute('visibility', 'hidden');
        } else {
            this.marker.setAttribute('visibility', 'visible');
            this.recurrent_ellipse.setAttribute('visibility', 'visible');
            var width = item.get_width();
            var height = item.get_height();
            
            var mx = pre_pos[0];
            var my = pre_pos[1] - height;
            this.marker.setAttribute('transform', 
                          'translate(' + mx + ',' + my + ') rotate(180)');
                          
            var ex = pre_pos[0];
            var ey = pre_pos[1] - height / 2;
            this.recurrent_ellipse.setAttribute('transform',
                          'translate(' + ex + ',' + ey + ')');
            this.recurrent_ellipse.setAttribute('rx', width / 2);
            this.recurrent_ellipse.setAttribute('ry', height / 2);
        }
    } else {        
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
}
