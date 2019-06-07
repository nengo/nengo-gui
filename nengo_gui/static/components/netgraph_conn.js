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
 * @param {string or null} info.kind - type of the connection
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
        this.connections = ng.svg_conns;
    } else {
        this.g_conns = ng.g_conns_mini;
        this.objects = ng.minimap_objects;
        this.connections = ng.minimap_conns;
    }

    /** the uids for the pre and post items in the connection
     *  The lists start with the ideal target item, followed by the parent
     *  of that item, and its parent, and so on.  If the first item on the
     *  this does not exist (due to it being inside a collapsed network),
     *  the connection will look for the next item on the list, and so on
     *  until it finds one that does exist. */
    this.pres = info.pre;
    this.posts = info.post;
    this.kind = info.kind;

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
    this.g.classList.add(this.kind);

    this.create_line();

    this.redraw_timeout = null;
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
        this.recurrent_ellipse.classList.add('recur');
        this.recurrent_ellipse.classList.add('conn');
        this.g.appendChild(this.recurrent_ellipse);

        this.marker = this.ng.createSVGElement('path');
        this.marker.classList.add('marker');
        this.g.appendChild(this.marker);

        if (this.minimap == false) {
            switch (this.kind) {
                case "inhibitory":
                    this.marker.setAttribute('d', "M 5,5.5 c 0,-5 5,-5 5,-5 V 10 c 0,0 -5,0 -5,-5 z");
                    break;
                case "modulatory":
                    this.marker.setAttribute('d', "M 7.5,0 0,-5 -7.5,0 0,5 z");
                    break;
                case "normal":
                default:
                    this.marker.setAttribute('d', "M 6.5 0 L 0 5.0 L 7.5 8.0 z");
                    break;
            }
        } else {
            this.marker.setAttribute('d', "M 4 0 L 0 2 L 4 4 z");
        }
    } else {
        this.line = this.ng.createSVGElement('path');
        this.line.classList.add('conn');
        this.g.appendChild(this.line);
        this.marker = this.ng.createSVGElement('path');
        this.marker.classList.add('marker');
        if (this.minimap == false) {
            switch (this.kind) {
                case "inhibitory":
                    this.marker.setAttribute('d', "M 4,0 C 4,-8 -4,-8 -4,-8 V 8 c 0,0 8,0 8,-8 z");
                    break;
                case "excitatory":
                    this.marker.setAttribute('d', "M -3,0.5 C -3,-6.8 -5.9,-9.7 -5.9,-9.7 L 5.8,0 -5.9,9.6 c 0,0 2.9,-2.8 2.9,-10.2 z");
                    break;
                case "modulatory":
                    this.marker.setAttribute('d', "M 7.5,0 0,-5 -7.5,0 0,5 z");
                    break;
                case "normal":
                default:
                    this.marker.setAttribute('d', "M 10 0 L -5 -5 L -5 5 z");
                    break;
            }
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
    this.ng.update_conn_groups(this, this.pre, this.post, pre, this.post);
    this.pre = pre;
    if (this.pre !== null) {
        /** add myself to pre's output connections list */
        this.pre.conn_out.push(this);
    }
}


/** set the item connecting to */
Nengo.NetGraphConnection.prototype.set_post = function(post) {
    // Normally connections have just one post ensemble -- the one that is
    // stored in this.post. However, modulatory connections must be registered
    // in both the pre and the post ensemble of the target connection (stored in
    // this.post). This helper function fetches the relevant post ensembles and
    // calls a callback function f for each non-null ensemble.
    let self = this;
    let for_each_post_ensemble = function(f) {
        let enss = [self.post]
        if (self.post instanceof Nengo.NetGraphConnection) {
            enss = [self.post.pre, self.post.post]
        }
        for (let ens of enss) {
            if (ens !== null) {
               f(ens);
            }
        }
    }

    // Remove this connection from the input connection list of the
    // post-ensembles.
    if (this.post !== null) {
        for_each_post_ensemble(function (ens) {
            var index = ens.conn_in.indexOf(self);
            if (index === -1) {
                console.log('error removing in set_post');
            }
            ens.conn_in.splice(index, 1);
        });
    }

    // Update the post ensemble/connection target and notify the post ensembles
    // about the incoming connection.
    this.ng.update_conn_groups(this, this.pre, this.post, this.pre, post);
    this.post = post;
    if (this.post !== null) {
        for_each_post_ensemble(function (ens) {
                ens.conn_in.push(self);
        });
    }
}


/** determine the best available item to connect from */
Nengo.NetGraphConnection.prototype.find_pre = function() {
    for (var i in this.pres) {
        var pre = this.objects[this.pres[i]] || this.connections[this.pres[i]];
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
        var post = this.objects[this.posts[i]] || this.connections[this.posts[i]];
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
        this.set_pre(null);
    }

    if (this.post != null) {
        this.set_post(null);
    }


    this.g_conns.removeChild(this.g);
    this.removed = true;

    delete this.ng.svg_conns[this.uid];
    
    if (!this.minimap) {
    	this.mini_conn.remove();
    }
}


/** redraw the connection */
Nengo.NetGraphConnection.prototype.redraw = function(defer=false) {
    // If defer is true, wait with the update until all events from the JS
    // event queue have been processed.
    if (defer) {
        if (this.redraw_timeout === null) {
            this.redraw_timeout = window.setTimeout(_ => {
                this.redraw_timeout = null;
                this.redraw();
            }, 0);
        }
        return;
    } else if (this.redraw_timeout !== null) {
        window.clearTimeout(this.redraw_timeout);
        this.redraw_timeout = null;
    }

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
        // Fetch information about the set of connections connecting to this
        // object
        const post_pos = this.post.get_screen_location();
        const [group_i, group_tot] = this.ng.get_conn_group_info(
            this, this.pre, this.post);

        // Fetch some information about the pre and post object location/size
        const [x1, y1] = pre_pos, [x2, y2] = post_pos;
        const w1 = this.pre.get_screen_width();
        const h1 = this.pre.get_screen_height();
        const w2 = this.post.get_screen_width();
        const h2 = this.post.get_screen_height();

        // Compute the index of arc in the connection group. arc_i == 0 means
        // that this is the central arc. Negative numbers correspond to an arc
        // in the top half, positive numbers to arcs in the bottom half.
        // Compensate for the fact that there are no straight lines (arc_i == 0)
        // in case the number of connections is even.
        const n_arcs = Math.ceil((group_tot - 1) / 2) | 0
        let arc_i = group_i - n_arcs;
        if (group_tot % 2 == 0 && arc_i >= 0) {
            arc_i++;
        }
        let has_arcs = this.post.type !== 'net';

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const angle_deg = 180.0 / Math.PI * angle;

        let rx = 0.0, ry = 0.0;
        if (arc_i === 0 || !has_arcs) {
            // Central line in the connection group. Draw as a straight line.
            this.line.setAttribute('d', `M ${x1} ${y1} L ${x2} ${y2}`)
        } else {
            // Radius along the x-axis (direction of the connection). This is
            // just half the length of the line.
            rx = 0.5 * Math.hypot(x2 - x1, y2 - y1);

            // Scale the radius along the y-axis with the average object size.
            // This determines the magnitude of the arc.
            const obj_size = 0.25 * (w1 + h1 + w2 + h2);
            ry = 0.5 * arc_i * obj_size / Math.sqrt(n_arcs);

            // Flip the order depending on the direction of the connection.
            if (x1 > x2) {
                ry *= -1;
            }

            // Use the SVG arc path primitive to draw the path
            this.line.setAttribute('d',
                `M ${x1} ${y1} A ${rx} ${Math.abs(ry)} ${angle_deg} 0 ` +
                `${(ry >= 0.0) ? 0 : 1} ${x2} ${y2}`);
        }

        const a1 = Math.atan2(h1,w1);
        const a2 = Math.atan2(h2,w2);

        var pre_length = this.intersect_length(angle, a1, w1, h1);
        var post_to_pre_angle = angle - Math.PI;
        if (post_to_pre_angle < -Math.PI) {post_to_pre_angle+=2*Math.PI;}
        var post_length = this.intersect_length(post_to_pre_angle, a2, w2, h2);

        let mx, my;
        if (this.kind == 'modulatory') {
            // Just centre modulatory connection markers on the post object
            // TODO: This won't work if the post-connection is an arc.
            mx = post_pos[0]
            my = post_pos[1]
        } else {
            if (has_arcs) {
                mx = (x1 + x2) * 0.5 - Math.sin(angle) * ry;
                my = (y1 + y2) * 0.5 + Math.cos(angle) * ry;
            } else {
                mx = (x1 + pre_length[0]) * 0.4 + (x2 + post_length[0]) * 0.6;
                my = (y1 + pre_length[1]) * 0.4 + (y2 + post_length[1]) * 0.6;
            }

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
        }
        this.marker.setAttribute('transform', `translate(${mx}, ${my}) rotate(${angle_deg})`);
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

/*
 * The following functions provide part of the NetGraphItem get_* interface
 * for the NetGraphConnection class. This way NetGraphConnection can be used
 * as a connection target.
 */

Nengo.NetGraphConnection.prototype.get_bounding_box = function () {
    const parent_rect = this.ng.svg.getBoundingClientRect();
    const rect = this.line.getBoundingClientRect();
    return [rect.left - parent_rect.left,
            rect.top - parent_rect.top,
            rect.right - parent_rect.left,
            rect.bottom - parent_rect.top];
}

Nengo.NetGraphConnection.prototype.get_screen_location = function() {
    let [x1, y1, x2, y2] = this.get_bounding_box();
    return [0.5 * (x1 + x2), 0.5 * (y1 + y2)];
}

Nengo.NetGraphConnection.prototype.get_screen_width = function() {
    let [x1, y1, x2, y2] = this.get_bounding_box();
    return x2 - x1;
}

Nengo.NetGraphConnection.prototype.get_screen_height = function() {
    let [x1, y1, x2, y2] = this.get_bounding_box();
    return y2 - y1;
}

