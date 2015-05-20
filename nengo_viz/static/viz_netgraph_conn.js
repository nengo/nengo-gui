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

//                 <g id = "recur" transform="translate(-18, -17.5)">
//                 <path 
//                     d="M6.451,28.748C2.448,26.041,0,22.413,0,18.425C0,
//                         10.051,10.801,3.262,24.125,3.262
//                     S48.25,10.051,48.25,18.425c0,6.453-6.412,11.964-15.45,14.153"/>
//                 </g>
//                 <g>
//                 <path id = "recurTriangle" 
//                     d="M 8 0 L 0 4 L 8 8 z""/>
//                 </g>
        this.recurrent_ellipse = this.ng.createSVGElement('path');
        this.recurrent_ellipse.setAttribute('d', 
                    "M6.451,28.748C2.448,26.041,0,22.413,0,18.425C0, \
                        10.051,10.801,3.262,24.125,3.262 \
                    S48.25,10.051,48.25,18.425c0,6.453-6.412,11.964-15.45,14.153");
        this.recurrent_ellipse.setAttribute('class','recur');
        this.recurrent_ellipse.setAttribute('transform','translate(-18, -17.5)');
        this.g.appendChild(this.recurrent_ellipse);
        
//         this.recurrent_ellipse = this.ng.createSVGElement('use');
//         this.recurrent_ellipse.setAttribute('class', 'recurrent');
//         this.recurrent_ellipse.setAttributeNS(
//             'http://www.w3.org/1999/xlink', 'href', '#recur');
//         this.g.appendChild(this.recurrent_ellipse);

        this.marker = ng.createSVGElement('path');
        this.marker.setAttribute('d', "M 8 0 L 0 4 L 8 8 z");
        this.g.appendChild(this.marker);
        
    } else {
        this.line = ng.createSVGElement('line');
        this.g.appendChild(this.line);    
        this.marker = ng.createSVGElement('path');
        this.marker.setAttribute('d', "M 10 0 L -5 -5 L -5 5 z");
        this.g.appendChild(this.marker);
    }

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
    
    var index = this.pre.conn_out.indexOf(this);
    if (index === -1) {
        console.log('error removing from conn_out');
    }
    this.pre.conn_out.splice(index, 1);    

    var index = this.post.conn_in.indexOf(this);
    if (index === -1) {
        console.log('error removing from conn_in');
    }
    this.post.conn_in.splice(index, 1);    

    
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
            var width = item.get_displayed_size()[0];
            var height = item.get_displayed_size()[1];
            
            var scale = item.shape.getAttribute('transform');
            var scale_value = parseFloat(scale.split(/[()]+/)[1]);

            this.recurrent_ellipse.setAttribute('style','stroke-width:' + 
                        2/scale_value+';');              
                          
            var ex = pre_pos[0] - scale_value*17.5;
            var ey = pre_pos[1] - height - scale_value*36;
            console.log([ex,ey])
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

        var mx = pre_pos[0] * 0.4 + post_pos[0] * 0.6;
        var my = pre_pos[1] * 0.4 + post_pos[1] * 0.6;
        var angle = 180 / Math.PI * Math.atan2(post_pos[1] - pre_pos[1], 
                                               post_pos[0] - pre_pos[0]);
        this.marker.setAttribute('transform', 
                          'translate(' + mx + ',' + my + ') rotate('+angle+')');
    }
}
