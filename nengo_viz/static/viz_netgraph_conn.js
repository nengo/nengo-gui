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
VIZ.NetGraphConnection = function(ng, info, minimap) {
    this.ng = ng;
    this.uid = info.uid;

    /** flag to indicate this Connection has been deleted */
    this.removed = false;

    /** the actual NetGraphItem currently connected to/from */
    this.pre = null;
    this.post = null;    

    this.minimap = minimap;
    if (minimap == false) {
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
        this.parent.child_connections.push(this);
    }
    
    /** create the line and its arrowhead marker */
    this.g = ng.createSVGElement('g');

    if (this.recurrent) {
        this.recurrent_ellipse = this.ng.createSVGElement('path');
        this.recurrent_ellipse.setAttribute('d', 
                    "M6.451,28.748C2.448,26.041,0,22.413,0,18.425C0, \
                        10.051,10.801,3.262,24.125,3.262 \
                    S48.25,10.051,48.25,18.425c0,6.453-6.412,11.964-15.45,14.153");
        this.recurrent_ellipse.setAttribute('class','recur');
        this.recurrent_ellipse.setAttribute('transform','translate(-18, -17.5)');
        this.g.appendChild(this.recurrent_ellipse);

        this.marker = ng.createSVGElement('path');
        this.marker.setAttribute('d', "M 8 0 L 0 4 L 8 8 z");
        this.g.appendChild(this.marker);
        
    } else {
        this.line = ng.createSVGElement('line');
        this.g.appendChild(this.line);    
        this.marker = ng.createSVGElement('path');
        if (this.minimap == false) {
            this.marker.setAttribute('d', "M 10 0 L -5 -5 L -5 5 z");
        } else {
            this.marker.setAttribute('d', "M 3 0 L -2.5 -2.5 L -2.5 2.5 z");
        }
        this.g.appendChild(this.marker);
    }

    this.redraw();

    this.g_conns.appendChild(this.g);
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
    if (this.pre !== null) {
        /** add myself to pre's output connections list */
        this.pre.conn_out.push(this);
    }
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
    if (this.post !== null) {
        /** add myself to post's input connections list */
        this.post.conn_in.push(this);
    }
}


/** determine the best available item to connect from */
VIZ.NetGraphConnection.prototype.find_pre = function() {
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
VIZ.NetGraphConnection.prototype.find_post = function() {
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

VIZ.NetGraphConnection.prototype.set_pres = function(pres) {
    this.pres = pres;
    this.set_pre(this.find_pre());
}
VIZ.NetGraphConnection.prototype.set_posts = function(posts) {
    this.posts = posts;
    this.set_post(this.find_post());
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
}


/** redraw the connection */
VIZ.NetGraphConnection.prototype.redraw = function() {
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

            this.recurrent_ellipse.setAttribute('style','stroke-width:' + 
                        2/scale_value+';');              
                          
            var ex = pre_pos[0] - scale_value*17.5;
            var ey = pre_pos[1] - height - scale_value*36;

            this.recurrent_ellipse.setAttribute('transform',
                          'translate(' + ex + ',' + ey + ')' + scale);
                          
            var mx = pre_pos[0];
            var my = pre_pos[1] - height - scale_value*32 - 5;
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
        
        var w1 = this.pre.get_width();
        var h1 = this.pre.get_height();
        var w2 = this.post.get_width();
        var h2 = this.post.get_height();

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
}
/**Function to determine the length of an intersection line through a rectangle
 ** theta - the angle of the line
 ** alpha - the angle between zero and the top right corner of the object
 **/
VIZ.NetGraphConnection.prototype.intersect_length = function(theta, alpha, width, height) {
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
