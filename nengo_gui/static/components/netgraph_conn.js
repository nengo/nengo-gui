/**
 * Network diagram connection line
 * @constructor
 *
 * @param {Nengo.NetGraph} ng - The containing Nengo.NetGraph
 * @param {dict} info - A set of constructor arguments, including:
 * @param {string} info.uid - A unique identifier
 * @param {string or null} info.parent - A containing NetGraphItem
 * @param {array of strings} info.pre - uid to connect from and its parents
 * @param {array of strings} info.post - uid to connect to and its parents
 */
Nengo.NetGraphConnection = function(ng, info, minimap, mini_conn) {
    this.ng = ng;
    this.uid = info.uid;

    /** flag to indicate this Connection has been deleted */
    this.removed = false;

    /** the actual NetGraphItem currently connected to/from */
    this.pre = null;
    this.post = null;

    this.minimap = minimap;
    this.mini_conn = mini_conn;
    if (!minimap) {
        this.g_conns = ng.g_conns;
        this.objects = ng.svg_objects;
    } else {
        this.g_conns = ng.g_conns_mini;
        this.objects = ng.minimap_objects;
    }

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
        this.parent = this.objects[info.parent];
        if (!minimap) {
        	this.parent.child_connections.push(this);
        }
    }

    /** create the line and its arrowhead marker */
    this.g = ng.createSVGElement('g');

    this.create_line();

    this.redraw();

    this.g_conns.appendChild(this.g);
}

Nengo.NetGraphConnection.prototype.set_recurrent = function(recurrent) {
    if (this.recurrent === recurrent) {
        return;
    }
    this.remove_line();
    this.recurrent = recurrent;
    this.create_line();
}

Nengo.NetGraphConnection.prototype.create_line = function() {
    if (this.recurrent) {
        this.recurrent_ellipse = this.ng.createSVGElement('path');
        this.recurrent_ellipse.setAttribute('d',
                    "M6.451,28.748C2.448,26.041,0,22.413,0,18.425C0, \
                        10.051,10.801,3.262,24.125,3.262 \
                    S48.25,10.051,48.25,18.425c0,6.453-6.412,11.964-15.45,14.153");
        this.recurrent_ellipse.setAttribute('class','recur');
        this.g.appendChild(this.recurrent_ellipse);

        this.marker = this.ng.createSVGElement('path');
        this.g.appendChild(this.marker);

        if (this.minimap == false) {
            this.marker.setAttribute('d', "M 6.5 0 L 0 5.0 L 7.5 8.0 z");
        } else {
            this.marker.setAttribute('d', "M 4 0 L 0 2 L 4 4 z");
        }

    } else {
        this.line = this.ng.createSVGElement('line');
        this.g.appendChild(this.line);
        this.marker = this.ng.createSVGElement('path');
        if (this.minimap == false) {
            this.marker.setAttribute('d', "M 10 0 L -5 -5 L -5 5 z");
        } else {
            this.marker.setAttribute('d', "M 3 0 L -2.5 -2.5 L -2.5 2.5 z");
        }
        this.g.appendChild(this.marker);
    }
}

Nengo.NetGraphConnection.prototype.remove_line = function() {
    if (this.recurrent) {
        this.g.removeChild(this.recurrent_ellipse);
        this.g.removeChild(this.marker);
        this.recurrent_ellipse = undefined;
        this.marker = undefined;
    } else {
        this.g.removeChild(this.line);
        this.g.removeChild(this.marker);
        this.line = undefined;
        this.marker = undefined;
    }
}



/** set the item connecting from */
Nengo.NetGraphConnection.prototype.set_pre = function(pre) {
    if (this.pre !== null) {
        /** if we're currently connected, disconnect */
        var index = this.pre.conn_out.indexOf(this);
        if (index === -1) {
            console.log('error removing in set_pre');
        }
        this.pre.conn_out.splice(index, 1);
    }
    this.pre = pre;
    if (this.pre !== null) {
        /** add myself to pre's output connections list */
        this.pre.conn_out.push(this);
    }
}


/** set the item connecting to */
Nengo.NetGraphConnection.prototype.set_post = function(post) {
    if (this.post !== null) {
        /** if we're currently connected, disconnect */
        var index = this.post.conn_in.indexOf(this);
        if (index === -1) {
            console.log('error removing in set_pre');
        }
        this.post.conn_in.splice(index, 1);
    }
    this.post = post;
    if (this.post !== null) {
        /** add myself to post's input connections list */
        this.post.conn_in.push(this);
    }
}


/** determine the best available item to connect from */
Nengo.NetGraphConnection.prototype.find_pre = function() {
    for (var i in this.pres) {
        var pre = this.objects[this.pres[i]];
        if (pre !== undefined) {
            return pre;
        } else {
            /** register to be notified if a better match occurs */
            this.ng.register_conn(this, this.pres[i]);
        }
    }
    return null;
}


/** determine the best available item to connect to */
Nengo.NetGraphConnection.prototype.find_post = function() {
    for (var i in this.posts) {
        var post = this.objects[this.posts[i]];
        if (post !== undefined) {
            return post;
        } else {
            /** register to be notified if a better match occurs */
            this.ng.register_conn(this, this.posts[i]);
        }
    }
    return null;
}

Nengo.NetGraphConnection.prototype.set_pres = function(pres) {
    this.pres = pres;
    this.set_pre(this.find_pre());
    
    if (!this.minimap) {
    	this.mini_conn.set_pres(pres);
    }
}
Nengo.NetGraphConnection.prototype.set_posts = function(posts) {
    this.posts = posts;
    this.set_post(this.find_post());
    
    if (!this.minimap) {
    	this.mini_conn.set_posts(posts);
    }
}


/** remove this connection */
Nengo.NetGraphConnection.prototype.remove = function() {
    if (!this.minimap && this.parent !== null) {
        var index = this.parent.child_connections.indexOf(this);
        if (index === -1) {
            console.log('error removing in remove');
        }
        this.parent.child_connections.splice(index, 1);
    }

    if (this.pre != null) {
        var index = this.pre.conn_out.indexOf(this);
        if (index === -1) {
            console.log('error removing from conn_out');
        }
        this.pre.conn_out.splice(index, 1);
    }

    if (this.post != null) {
        var index = this.post.conn_in.indexOf(this);
        if (index === -1) {
            console.log('error removing from conn_in');
        }
        this.post.conn_in.splice(index, 1);
    }


    this.g_conns.removeChild(this.g);
    this.removed = true;

    delete this.ng.svg_conns[this.uid];
    
    if (!this.minimap) {
    	this.mini_conn.remove();
    }
}


/** redraw the connection */
Nengo.NetGraphConnection.prototype.redraw = function() {
    if (this.pre === null || this.post === null) {
        if (this.line !== undefined) {
            this.line.setAttribute('visibility', 'hidden');
        }
        this.marker.setAttribute('visibility', 'hidden');
        return;
    } else {
        if (this.line !== undefined) {
            this.line.setAttribute('visibility', 'visible');
        }
        this.marker.setAttribute('visibility', 'visible');
    }
    var pre_pos = this.pre.get_screen_location();

    if (this.recurrent) {
        var item = this.objects[this.pres[0]];
        if (item === undefined) {
            this.marker.setAttribute('visibility', 'hidden');
            this.recurrent_ellipse.setAttribute('visibility', 'hidden');
        } else {
            this.marker.setAttribute('visibility', 'visible');
            this.recurrent_ellipse.setAttribute('visibility', 'visible');
            var width = item.get_displayed_size()[0];
            var height = item.get_displayed_size()[1];

            var scale = item.shape.getAttribute('transform');
            var scale_value = parseFloat(scale.split(/[()]+/)[1]);

            if (this.minimap == false) {
                this.recurrent_ellipse.setAttribute('style','stroke-width:' +
                            2/scale_value+';');
            } else {
                this.recurrent_ellipse.setAttribute('style','stroke-width:' +
                            1/scale_value+';');
            }

            var ex = pre_pos[0] - scale_value*17.5;
            var ey = pre_pos[1] - height - scale_value*36;

            this.recurrent_ellipse.setAttribute('transform',
                          'translate(' + ex + ',' + ey + ')' + scale);

            var mx = pre_pos[0]-1;
            if (this.minimap == false) {
                var my = pre_pos[1] - height - scale_value*32.15 - 5;
            } else {
                var my = pre_pos[1] - height - scale_value*32 - 2;
            }
            this.marker.setAttribute('transform',
                          'translate(' + mx + ',' + my + ')');
        }
    } else {
        var post_pos = this.post.get_screen_location();
        this.line.setAttribute('x1', pre_pos[0]);
        this.line.setAttribute('y1', pre_pos[1]);
        this.line.setAttribute('x2', post_pos[0]);
        this.line.setAttribute('y2', post_pos[1]);

        var angle = Math.atan2(post_pos[1] - pre_pos[1], //angle between objects
                                               post_pos[0] - pre_pos[0]);

        var w1 = this.pre.get_screen_width();
        var h1 = this.pre.get_screen_height();
        var w2 = this.post.get_screen_width();
        var h2 = this.post.get_screen_height();

        a1 = Math.atan2(h1,w1);
        a2 = Math.atan2(h2,w2);

        var pre_length = this.intersect_length(angle, a1, w1, h1);
        var post_to_pre_angle = angle - Math.PI;
        if (post_to_pre_angle < -Math.PI) {post_to_pre_angle+=2*Math.PI;}
        var post_length = this.intersect_length(post_to_pre_angle, a2, w2, h2);

        var mx = (pre_pos[0]+pre_length[0]) * 0.4
                    + (post_pos[0]+post_length[0]) * 0.6;
        var my = (pre_pos[1]+pre_length[1]) * 0.4
                    + (post_pos[1]+post_length[1]) * 0.6;

        //Check to make sure the marker doesn't go past either endpoint
        vec1 = [post_pos[0]-pre_pos[0], post_pos[1]-pre_pos[1]];
        vec2 = [mx-pre_pos[0], my-pre_pos[1]];
        dot_prod = (vec1[0]*vec2[0] + vec1[1]*vec2[1])
            / (vec1[0]*vec1[0]+vec1[1]*vec1[1]);

        if (dot_prod < 0) {
            mx = pre_pos[0];
            my = pre_pos[1];
        } else if (dot_prod>1){
            mx = post_pos[0];
            my = post_pos[1];
        }
        angle = 180 / Math.PI * angle;
        this.marker.setAttribute('transform',
                          'translate(' + mx + ',' + my + ') rotate('+ angle +')');
    }
    
    if (!this.minimap && this.ng.mm_display) {
    	this.mini_conn.redraw();
    }
}
/**Function to determine the length of an intersection line through a rectangle
 ** theta - the angle of the line
 ** alpha - the angle between zero and the top right corner of the object
 **/
Nengo.NetGraphConnection.prototype.intersect_length = function(theta, alpha, width, height) {
    var quad = 0;
    var beta = 2*(Math.PI/2 - alpha);  //angle between top corners
    var h2 = (height/2)*(height/2);
    var w2 = (width/2)*(width/2);

    if (theta >= -alpha && theta < alpha) { //1st quadrant
        var x = width/2;
        var y = width/2*Math.tan(theta);
    } else if (theta >= alpha && theta < alpha + beta) { //2nd quadrant
        var x = (height/2)/Math.tan(theta);
        var y = height/2;
    } else if (theta >= alpha + beta || theta < -(alpha + beta)) { //3rd quadrant
        var x = -width/2;
        var y = -width/2*Math.tan(theta);
    } else { //4th quadrant
        var x = -(height/2)/Math.tan(theta);
        var y = -height/2;
    }

    return [x,y];
}
