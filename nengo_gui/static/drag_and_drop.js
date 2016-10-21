Nengo.VPL = function(){
    var self = this;
    $("#mode_list").height($(document).height()*0.85);
    $(document).keyup(function(e) {
        if (e.keyCode === 27) self.unselect_component("Pointer");   // esc
    });

    self.contextmenu = null;
    //Setting Click handlers for toggle buttons
    $("#Delete").on('click',function(){
        self.component_toggle('Delete');
    })
    $("#Pointer").on('click',function(){
        self.unselect_component("Pointer");
    })
    $("#Node").on('click',function(){
        self.component_toggle('Node');
    });

    $("#Ensemble").on('click',function(){
        self.component_toggle('Ensemble');
    });

    $("#Network").on('click',function(){
        self.component_toggle('Network');
    });

    $("#Connection").on('click',function(){
        self.component_toggle('Connection');
    });
}

/** Activates type mode for creating components */
Nengo.VPL.prototype.component_toggle = function(type) {
    var ng = Nengo.netgraph;
    var self = this;

    /** Activates and deactivates modes, accordingly */
    if($("#"+type).attr('class') == 'mode off'){
        self.unselect_component();
        $("#"+type).attr('class','mode on');
    } else{
        self.unselect_component("Pointer");
        return;
    }

    /** Activates component or connection mode */
    if($("#"+type).attr('class') == 'mode on'){
        var cur_obj = "";
        var obj_class = "";
        var obj_name = "";
        var element = document.getElementById('main');
        /** Adds green border and deactivates click and drag events. */
        element.style['box-shadow'] = "inset 0 0 30px #00FF00";
        self.toggle_item_drag(false);

        if(type != 'Connection' && type != "Delete"){
            $('#netgraph').css('cursor','crosshair');
            self.create_component(type);
        } else if(type == 'Connection'){
            $('#netgraph').css('cursor','cell');
            self.create_connection();
        } else if(type == 'Delete'){
            $('#netgraph').css('cursor','pointer');
            self.delete_mode();
        }
    }
}

/** Creates the interaction, click events, and visuals for drawing and creation
    of components. type - one of ['Node','Ensemble'.'Network']*/
Nengo.VPL.prototype.create_component = function(type){
    var ng = Nengo.netgraph;
    var self = this;
    var cur_obj, obj_class,obj_name;
    var cursor_uid = "cursor."+type;
    var name_convert = {"Node":"node","Ensemble":"ens","Network":"net"}
    var element = document.getElementById('main');

    $(document).mousedown(function(event) {
        /** Cancels/deactivates click event if it is a right click. */
        if(event.button == 2){
            self.unselect_component("Pointer");
            return;
        }

        cur_obj = $($(event.target).parent()[0]);
        obj_class = cur_obj.attr('class');
        obj_name = cur_obj.attr('data-id');

        /** Checks if user click is within the netgraph. */
        if (event.pageX - $("#main").offset().left < 0 ||
            event.pageX - $("#main").offset().left > $("#main").width() - 80 ||
            event.pageY - $("#main").offset().top < 0 ||
            event.pageY - $("#main").offset().top > $("#main").height() - 80) {
                return;
        }
        var cursor_start = self.compute_position(event);
        var cursor_width, cursor_height, cursor_end, final_pos, final_size;
        var mousemoved = false;

        if(obj_class.indexOf('net') != -1){
            event.parent_network = obj_name;
        } else{
            event.parent_network = null;
        }

        /** Creates temporary cursor component. */
        ng.create_object({'pos':[-1000,-1000],'size':
        [0,0],'uid':cursor_uid,
        'type':name_convert[type],'parent':null,'label':""});
        var cursor_item = ng.svg_objects[cursor_uid];
        cursor_item.shape.style['fill-opacity'] = 0.4;
        cursor_item.x = cursor_start[0];
        cursor_item.y = cursor_start[1];

        /** Activates if the event is a click and drag. */
        $(document).mousemove(function(evt) {

            mousemoved = true;

            cursor_end = self.compute_position(evt);
            cursor_width = Math.abs(cursor_end[0] - cursor_start[0]);
            cursor_height = Math.abs(cursor_end[1] - cursor_start[1]);
            cursor_item.x = cursor_start[0] + (cursor_end[0] - cursor_start[0])/2;
            cursor_item.y = cursor_start[1] + (cursor_end[1] - cursor_start[1])/2
            cursor_item.width = cursor_width/2;
            cursor_item.height = cursor_height/2;
            cursor_item.constrain_position();
            cursor_item.redraw();
            final_pos = [cursor_item.x,cursor_item.y];
            final_size = [cursor_item.width,cursor_item.height];
            return false;
        });

        /** On drag end */
        $(document).one('mouseup', function() {
            ng.on_message({"data":JSON.stringify({"type":"remove","uid":cursor_uid})});

            if(mousemoved == true){
                /** Checks if component is larger than minimum size. */
                if(cursor_width > 0.08 && cursor_height > 0.08){
                    /** Converts all properties from the cursor component
                    *   to the new component. */
                    var obj_prop = {};
                    obj_prop.pos = self.compute_position({"parent_network":event.parent_network,
                    "component_pos":final_pos});
                    obj_prop.size = self.compute_size(type,{"parent_network":event.parent_network,
                    "component_size":final_size});
                    obj_prop.parent_network = event.parent_network;

                    var comp_name = self.add_component(type,obj_prop);
                    /** Checks every 100ms until the component shows up in
                    *   the netgraph and notifies the server. */
                    var checkExist = setInterval(function() {
                        if (ng.svg_objects[comp_name] != null) {
                        var new_comp = ng.svg_objects[comp_name];
                        self.toggle_item_drag(false);
                        new_comp.constrain_position();
                        ng.redraw();
                        ng.override_positions[comp_name] = [new_comp.x,new_comp.y];
                        ng.override_sizes[comp_name] = [new_comp.width,new_comp.height];
                        ng.notify({act:"pos_size", uid:comp_name, x:new_comp.x,
                            y:new_comp.y, width: new_comp.width,
                            height: new_comp.height});


                        clearInterval(checkExist);
                        }
                    }, 100);
                }
                $(document).unbind('mousemove mouseup');
            }
        });
    });
}

Nengo.VPL.prototype.create_connection = function(){
    var self = this;
    var cur_obj = "";
    var obj_class = "";
    var obj_name = "";
    var ng = Nengo.netgraph;
    var mousemove = false;
    /** Creates dashed line to signify potential connection. */
    self.delete_dashed_line();
    self.create_dash_line();

    var objects = {};
    objects.uids = [];
    objects.classes = [];

    self.show_connectable(true,true);
    /** On main click and not drag. */
    $(document).mousedown(function(event) {
        if(event.button == 2){
            self.unselect_component("Pointer");
            return;
        }
        cur_obj = $($(event.target).parent()[0]);
        if(cur_obj.attr('class') != null){
            obj_class = cur_obj.attr('class').split(" ")[0];
        }
        obj_name = cur_obj.attr('data-id');
        var rel_pos = [];
        var obj_pos;
        var over_obj_pos;

        /** Adds first part of potential connection if
        *   it is an ensemble or node. */
        if(obj_class != null && (obj_class == 'ens' ||
            obj_class == 'node')){
                objects.uids.push(obj_name);
                objects.classes.push(obj_class);
        }
        if(objects.uids.length == 0){
            return;
        } else{
            self.show_connectable(true,false);
        }
        $(document).mousemove(function(evt) {
            mousemove = true;
            /** After the first component is selected. */
            rel_pos = [];
            obj_pos = [];
            over_obj_pos = [];
            var over_obj_svg;
            var over_obj_name;
            var over_obj_class;

            /** Updates cursor connection line's
            *   position. */
            var page_offset = $("#main").offset();
            obj_pos = ng.svg_objects[objects.uids[0]].get_screen_location();
            over_obj_svg = $($(evt.target).parent()[0]);
            over_obj_name = over_obj_svg.attr('data-id');
            if(over_obj_svg.attr('class') != null){
                over_obj_class = over_obj_svg.attr('class').split(" ")[0];
            }

            $(".temp_line").attr('x1',obj_pos[0]);
            $(".temp_line").attr('y1',obj_pos[1]);
            if(over_obj_class != null && (over_obj_class == 'ens'||
                over_obj_class == 'node')){
                rel_pos = [];
                over_obj_pos = ng.svg_objects[over_obj_name].get_screen_location();

                rel_pos[0] = over_obj_pos[0]-0.07*(over_obj_pos[0]-obj_pos[0]);
                rel_pos[1] = over_obj_pos[1]-0.07*(over_obj_pos[1]-obj_pos[1]);

                $(".temp_line").attr('x2',(rel_pos[0]));
                $(".temp_line").attr('y2',(rel_pos[1]));

            }else{
                rel_pos[0] = evt.pageX-page_offset.left;
                rel_pos[1] = evt.pageY-page_offset.top;
                $(".temp_line").attr('x2',rel_pos[0]);
                $(".temp_line").attr('y2',rel_pos[1]);
            }
        });
        $(document).one('mouseup', function(evt) {
            /** Completes Connection, adds appropriate
            *   code to editor and resets line. */
            cur_obj = $($(evt.target).parent()[0]);
            obj_class = cur_obj.attr('class').split(" ")[0];
            obj_name = cur_obj.attr('data-id');

            /** Adds first part of potential connection if
            *   it is an ensemble or node. */
            if(rel_pos != false){
                if(obj_class != null && (obj_class == 'ens' ||
                    obj_class == 'node')){
                        objects.uids.push(obj_name);
                        objects.classes.push(obj_class);
                }
                if(objects.uids.length == 2){
                    self.add_connection(objects.uids[0],objects.uids[1]);
                }
            }
            objects = {};
            objects.uids = [];
            objects.classes = [];
            self.delete_dashed_line();
            self.create_dash_line();
            self.show_connectable(true,true);
            $(document).unbind('mousemove mouseup');
        });
    });
}

Nengo.VPL.prototype.delete_mode = function(){
    var self = this;
    var cur_obj = "";
    var obj_class = "";
    var obj_name = "";
    $(document).mousemove(function(event) {
        if(event.button == 2){
            self.unselect_component("Pointer");
            return;
        }
        cur_obj = $($(event.target).parent()[0]);
        if(cur_obj.attr('class') != null){
            obj_class = cur_obj.attr('class').split(" ")[0];
        }
        obj_name = cur_obj.attr('data-id');
        if(obj_name != null){
            $("#netgraph").css('cursor','pointer');
        }else{
            $("#netgraph").css('cursor','');
        }
        $(document).click(function(evt){
            if(obj_name != null){
                self.delete_component(obj_name);
            }
        });
    });
}
/** Deactivates the various styling and event handlers activated by the
*   component toggle. */
Nengo.VPL.prototype.unselect_component = function(default_mode){
    var ng = Nengo.netgraph;
    this.toggle_item_drag(true);
    $(".mode").attr('class','mode off');
    $('#netgraph').css('cursor','');
    if(default_mode == "Pointer"){
        $("#"+default_mode).attr('class','mode on');
    }
    this.show_connectable(false,false);
    this.delete_dashed_line();
    $(document).unbind('mousedown mousemove mouseup click');
    var element = document.getElementById('main');
    element.style['box-shadow'] = "";
}

/** Creates and inserts the appropriate code for the type of connection */
Nengo.VPL.prototype.add_connection = function(obj1,obj2){
    var ng = Nengo.netgraph;
    var item1 = ng.svg_objects[obj1];
    var item2 = ng.svg_objects[obj2];
    var dim_out = item1.dimensions;
    var dim_in = 0;

    if(item2.type == "node" && item2.passthrough == null){
        dim_in = 0;
    } else{
        dim_in = item2.dimensions;
    }

    var component_code = "nengo.Connection("+obj1+", "+obj2+")";
    if (dim_out > dim_in){
        component_code = "nengo.Connection("+obj1+"[:"+dim_in+"], "+obj2+")";
    } else if (dim_out < dim_in) {
        component_code = "nengo.Connection("+obj1+", "+obj2+"[:"+dim_out+"])";
    }

    if(dim_in != 0){
        var tab = "    ";
        var editor = ace.edit('editor');
        var last_line = editor.session.getLength() + 1;

        editor.session.insert({"row":editor.session.getLength()+1,"column":0}
                                ,"\n");
        editor.session.insert({"row":editor.session.getLength()+1,"column":0}
                                ,tab + component_code);
    }
}

/** Creates and inserts the appropriate code for the type of connection */
Nengo.VPL.prototype.add_component = function(type, info) {
    var tab = "    ";
    var ng = Nengo.netgraph;
    var editor = ace.edit('editor');
    var last_line = editor.session.getLength() + 1;
    var obj_names = ng.svg_objects;
    var size = []
    var component_code = "";
    var component_name = "";
    var code_str = "";
    var name_switch = {"Ensemble":"ensemble","Node":"node","Network":"network"};
    var parent_net = ng.svg_objects[info.parent_network];

    if(info.parent_network == null || info.parent_network == "cursor.Network"){
        component_name = this.open_name(name_switch[type]);
    } else{
        component_name = this.open_name(info.parent_network+"."+name_switch[type]);
    }

    if (type == "Ensemble") {
        code_str = " = nengo.Ensemble(n_neurons=50, dimensions=1)";
    } else if (type == "Node") {
        code_str = " = nengo.Node([0])";
    } else if (type == "Network") {
        code_str = " = nengo.Network()";
    }
    component_code = component_name + code_str;
    ng.override_sizes[component_name] = info.size;
    ng.override_positions[component_name] = info.pos;

    if(info.parent_network == null || info.parent_network == "cursor.Network"){
        editor.session.insert({"row":last_line+1,"column":0},"\n");
        editor.session.insert({"row":last_line+1,"column":0},tab + component_code);
    } else{
        var selection = editor.find("with "+info.parent_network+":");
        if(selection != null){
            editor.replace("with "+info.parent_network+":\n"+tab+tab+
                        component_code);
        } else{
            editor.session.insert({"row":editor.session.getLength()+1,"column":0}
                                    ,"\n");
            editor.session.insert({"row":last_line+1,"column":0},
            tab+"with "+info.parent_network+":\n"+tab+tab+
            component_code+"\n"+tab+tab+"pass");
        }
    }
    return component_name;
}

/** Computes the position of a component based on the click event. */
Nengo.VPL.prototype.compute_position = function(event) {
    var ng = Nengo.netgraph;
    var pos = [];
    //Handles mouse position Transform
    var w = ng.get_scaled_width();
    var offsetX = ng.offsetX * w;
    var h = ng.get_scaled_height();
    var offsetY = ng.offsetY * h;
    var page_offset = $("#main").offset();
    var parent, ratio_x, ratio_y;
    var parent_pos = [1,1];
    if(event.component_pos == "" || event.component_pos == null){
        pos[0] = ((event.pageX - page_offset.left) - offsetX) / w;
        pos[1] = ((event.pageY - page_offset.top) - offsetY) / h;
    } else{
        pos = event.component_pos;
    }
    if(event.parent_network != "" && event.parent_network != null &&
        event.parent_network != "cursor.Network"){

        var parent = ng.svg_objects[event.parent_network];
        var parent_size = this.compute_network_size(parent);
        parent.expand();
        parent_pos[0] = (parent.get_screen_location()[0] - offsetX)/w;
        parent_pos[1] = (parent.get_screen_location()[1] - offsetY)/h;
        pos[0] = ((pos[0] - parent_pos[0])/parent_size[0] + 1)/2;
        pos[1] = ((pos[1] - parent_pos[1])/parent_size[1] + 1)/2;
    }
    return pos;
}

/** Computes the size of a component based on the click event. */
Nengo.VPL.prototype.compute_size = function(type,event){
    var ng = Nengo.netgraph;
    var size = [];
    var parent_net = ng.svg_objects[event.parent_network];
    var component_size = event.component_size;
    var parent_size = [];
    size = [component_size[0],component_size[1]];
    if(event.parent_network != null && event.parent_network != "cursor.Network"){
        size= [size[0]/2,size[1]/2];
        parent_size = this.compute_network_size(parent_net);
        size = [size[0]/parent_size[0],size[1]/parent_size[1]];
    }
    return size;
}

/** Computes the size of a network in the global coordinate system. */
Nengo.VPL.prototype.compute_network_size = function (parent_net){
    var parent_size = [1,1];
    if (parent_net.parent != null) {
        parent_size[0] = parent_net.width*2;
        parent_size[1] = parent_net.height*2;
        parent_net = parent_net.parent;
        while(parent_net.parent != null){
            parent_size[0] *= parent_net.width*2;
            parent_size[1] *= parent_net.height*2;
            parent_net = parent_net.parent;
        }
    }
    parent_size = [parent_net.width*parent_size[0],
                   parent_net.height*parent_size[1]];
    return parent_size;
}

Nengo.VPL.prototype.open_name = function(name) {
    var num = 1;
    var editor = ace.edit('editor');
    while (editor.find(name + num + " =") != null) {
        num ++;
    }
    return name + num;
}

Nengo.VPL.prototype.show_connectable = function(toggle,allowed_connect){
    var node_style;
    if(toggle == false){
        $(".node").attr("class","node");
        $(".ens").attr("class","ens");
        $(".node").unbind("mouseover mouseout");
        $(".ens").unbind("mouseover mouseout");
        return;
    }
    else{
        if(allowed_connect == true){
            node_style = 'node node_effect_good';
        } else{
            node_style = 'node node_effect_bad';
        }
        $(".node").mouseover(function(){
            $(this).attr('class',node_style);
        }).mouseout(function(){
            $(this).attr('class','node');
        })
        $(".ens").mouseover(function(){
            $(this).attr('class','ens ens_effect_good');
        }).mouseout(function(){
            $(this).attr('class','ens');
        });
    }
}

Nengo.VPL.prototype.create_dash_line = function(){
    var svg = d3.select('#netgraph');
    var temp_g = svg.append('svg:g').attr("class","temp_group");
    var line = temp_g.append('svg:line')
            .attr('stroke','#000000')
            .attr('stroke-linecap','line')
            .attr('stroke-dasharray',"20, 10")
            .attr('stroke-width','10')
            .attr('class','temp_line')
            .attr('marker-end', 'url(#marker_arrow)');
    var marker = temp_g.append('svg:marker')
            .attr('id', 'marker_arrow')
            .attr('markerHeight', 6)
            .attr('markerWidth', 6)
            .attr('markerUnits', 'strokeWidth')
            .attr('orient', 'auto')
            .attr('refX', 0)
            .attr('refY', 0)
            .attr('viewBox', '-5 -5 10 10')
            .append('svg:path')
                .attr('d', 'M 0,0 m -5,-5 L 5,0 L -5,5 Z')
                .attr('fill', '#000000')

}

Nengo.VPL.prototype.delete_dashed_line = function(){
    if($(".temp_group") != null){
        $(".temp_group").remove();
    }
}

/** Activates/deactivates drag/resize events. */
Nengo.VPL.prototype.toggle_item_drag = function(toggle){
    var self = this;
    if(self.contextmenu == null && jQuery._data($("#netgraph")[0],"events")['contextmenu'] != null){
        self.contextmenu = jQuery._data( $("#netgraph")[0], "events" )['contextmenu'][0].handler
    }
    if(toggle){
        setTimeout(function(){
            $("#netgraph").bind("contextmenu",self.contextmenu);
        },100);
    } else{
        $("#netgraph").bind("contextmenu",function(event){
            event.preventDefault()});
    }
    interact($("#netgraph")[0]).draggable({
        enabled: toggle  // explicitly disable dragging
    });
    for(var item in Nengo.netgraph.svg_objects){
        interact(Nengo.netgraph.svg_objects[item].g).draggable({
            enabled: toggle  // explicitly disable dragging
        });
        interact(Nengo.netgraph.svg_objects[item].area).resizable({
            enabled: toggle  // explicitly disable dragging
        });
    }
}

/** Deletes code that is used to create a nengo component */
Nengo.VPL.prototype.delete_component = function(uid){
    var editor = ace.edit("editor");
    var re = new RegExp("(?:[^\.])"+uid+"\\s*=");
    var component = Nengo.netgraph.svg_objects[uid];
    var start_with,end_with,net_children;
    var self = this;

    this.delete_connections(uid);
    var code_line = editor.find(re);

    while(code_line != null){
        editor.removeLines(code_line.start.row);
        code_line = editor.find(re);
    }

    if(component.type == "net"){
        var net_children = component.children;
        for(var x = 0; x < net_children.length; x++){
          this.delete_component(net_children[x].uid);
        }

        start_with = editor.find("with "+uid);
        if(start_with != null){
            editor.removeLines(start_with.start.row);
            end_with = editor.find("pass");
            editor.removeLines(end_with.start.row);
        }
    }
}

Nengo.VPL.prototype.delete_connections = function(uid){
    this.delete_connection(uid,"");
}

Nengo.VPL.prototype.delete_connection = function(uid1,uid2){
    var editor = ace.edit("editor");
    var re = new RegExp("nengo\.Connection\s*.*(?:[^\.])"+uid1+".*"+uid2);
    var code_line = editor.find(re);
    while(code_line){
        editor.removeLines(code_line.start.row);
        code_line = editor.find(re);
    }
}

Nengo.VPL.prototype.config_component = function(uid){
    var self = this;
    var editor = ace.edit("editor");
    var re = new RegExp("(?:[^\.])"+uid+"\\s*=");
    var code_line = editor.find(re);
    var component = Nengo.netgraph.svg_objects[uid];
    Nengo.modal.component_config(uid);
    Nengo.modal.show();
    Nengo.modal.footer('ok_cancel',
        function(e) {
            var n_number = $("#config-neuron-number").val();
            var dim_number = $("#config-dimension").val();
            var Range = require("ace/range").Range;
            var tab = "    ";
            var tabs;
            Nengo.netgraph.svg_objects[uid].n_neurons = n_number;
            Nengo.netgraph.svg_objects[uid].dimensions = dim_number;

            if(component.parent == null){tabs = tab;}
            else{tabs = tab+tab;}

            editor.session.replace(new Range(code_line.start.row, 0, code_line.start.row, Number.MAX_VALUE),
            tabs+uid+" = nengo.Ensemble(n_neurons="+n_number+",dimensions="+dim_number+")");
            self.delete_connections(uid);
            var conn_in = component.conn_in;
            var conn_out = component.conn_out;
            for(var x = 0; x < conn_in.length; x++){
                self.add_connection(conn_in[x].pre.uid,conn_in[x].post.uid);
            }
            for(var x = 0; x < conn_out.length; x++){
                self.add_connection(conn_out[x].pre.uid,conn_out[x].post.uid);
            }
            $('#OK').attr('data-dismiss', 'modal');
        },
        function () {
            $('#cancel-button').attr('data-dismiss', 'modal');
        }
    );
}

$(document).ready(function(){
  Nengo.vpl = new Nengo.VPL();
});
