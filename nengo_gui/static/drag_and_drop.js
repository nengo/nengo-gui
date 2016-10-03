Nengo.VPL = function(){
  var self = this;
  //Setting Click handlers for toggle buttons
  $("#mode_list").height($(document).height()*0.85);
  $(document).keyup(function(e) {
    if (e.keyCode === 27) self.unselct_component();   // esc
  });

  $("#Node > svg").on('click',function(){
      self.component_toggle('Node');
  });

  $("#Ensemble > svg").on('click',function(){
      self.component_toggle('Ensemble');
  });

  $("#Network > svg").on('click',function(){
      self.component_toggle('Network');
  });

  $("#Connection > svg").on('click',function(){
      self.component_toggle('Connection');
  });
}
//Activates type mode for creating components
Nengo.VPL.prototype.component_toggle = function(type) {
    var ng = Nengo.netgraph;
    var self = this;
    if(interact($("#netgraph")[0]).ondragmove != null){
        drag_func = interact($("#netgraph")[0]).ondragmove;
    }
    if($("#"+type).attr('class') == 'mode off'){
        self.unselct_component();
        $("#"+type).attr('class','mode on');
    } else{
        self.unselct_component();
        return;
    }
    if($("#"+type).attr('class') == 'mode on'){


        var cur_obj = "";
        var obj_class = "";
        var obj_name = "";
        if(type != 'Connection'){
            $('#netgraph').css('cursor','crosshair','important');
            self.create_component(type);
        } else if(type == 'Connection'){
            $('#netgraph').css('cursor','cell','important');
            self.create_connection();
        }
    }
}


Nengo.VPL.prototype.create_component = function(type){
    var ng = Nengo.netgraph;
    var self = this;
    var cur_obj, obj_class,obj_name;
    var cursor_uid = "cursor."+type;
    var name_convert = {"Node":"node","Ensemble":"ens","Network":"net"}
    var element = document.getElementById('main');
    element.style['box-shadow'] = "inset 0 0 30px #00FF00";
    self.toggle_item_drag(false);

    $(document).mousedown(function(event) {
        if(event.button == 0){}else{return;}

        cur_obj = $($(event.target).parent()[0]);
        obj_class = cur_obj.attr('class');
        obj_name = cur_obj.attr('data-id');

        /** Creates cursor shape. */
        if (event.pageX - $("#main").offset().left < 0 ||
            event.pageX - $("#main").offset().left > $("#main").width() - 80 ||
            event.pageY - $("#main").offset().top < 0 ||
            event.pageY - $("#main").offset().top > $("#main").height() - 80) {
                return;
        }
        var cursor_start = self.compute_position(event);
        var cursor_width, cursor_height, cursor_end, final_pos, final_size;
        var mousemoved = false;

        ng.create_object({'pos':[-1000,-1000],'size':
        self.compute_size(type,{"parent_network":""}),'uid':cursor_uid,
        'type':name_convert[type],'parent':null,'label':""});

        var cursor_item = ng.svg_objects[cursor_uid];
        cursor_item.shape.style['fill-opacity'] = 0.4;
        cursor_item.width = 0;
        cursor_item.height = 0;
        cursor_item.x = cursor_start[0];
        cursor_item.y = cursor_start[1];

        $(document).mousemove(function(evt) {

            mousemoved = true;

            cursor_end = self.compute_position(evt);
            cursor_width = Math.abs(cursor_end[0] - cursor_start[0]);
            cursor_height = Math.abs(cursor_end[1] - cursor_start[1]);
            cursor_item.x = cursor_start[0] + (cursor_end[0] - cursor_start[0])/2;
            cursor_item.y = cursor_start[1] + (cursor_end[1] - cursor_start[1])/2
            cursor_item.width = cursor_width/2;
            cursor_item.height = cursor_height/2;
            cursor_item.redraw();
            final_pos = [cursor_item.x,cursor_item.y];
            final_size = [cursor_item.width,cursor_item.height];
            return false;
        });

        $(document).one('mouseup', function() {
            ng.on_message({"data":JSON.stringify({"type":"remove","uid":cursor_uid})});


            /**Checks if click is in a valid place and if the object
            * clicked on is a network. */
            if(mousemoved == true){
                if (event.pageX - $("#main").offset().left > 0 &&
                    event.pageX - $("#main").offset().left < $("#main").width() - 80 &&
                    event.pageY - $("#main").offset().top > 0 &&
                    event.pageY - $("#main").offset().top < $("#main").height() - 80) {
                    if(obj_class.indexOf('net') != -1){
                        event.parent_network = obj_name;
                    } else{
                        event.parent_network = "";
                    }
                    if(cursor_width > 0.08 && cursor_height > 0.08){
                        var obj_prop = {};
                        obj_prop.pos = self.compute_position({"parent_network":event.parent_network,
                        "component_pos":final_pos});
                        obj_prop.size = self.compute_size(type,{"parent_network":event.parent_network,
                        "component_size":final_size});
                        obj_prop.parent_network = event.parent_network;
                        console.log(obj_prop);
                        var comp_name = self.add_component(type,obj_prop);
                        var checkExist = setInterval(function() {
                           if (ng.svg_objects[comp_name] != null) {
                              self.toggle_item_drag(false);
                              ng.notify({act:"pos_size", uid:comp_name, x:final_pos[0],
                                        y:final_pos[1], width: final_size[0],
                                        height: final_size[1]});
                              clearInterval(checkExist);
                           }
                        }, 100); // check every 100ms
                    }
                }
                $(document).unbind('mousemove mouseup');
            }

        });

        // Using return false prevents browser's default,
        // often unwanted mousemove actions (drag & drop)
    });
}

Nengo.VPL.prototype.create_connection = function(){
    var cur_obj = "";
    var obj_class = "";
    var obj_name = "";
    var self = this;
    var ng = Nengo.netgraph;
    /** Creates dashed line to signify potential connection. */
    self.create_dash_line();

    var objects = {};
    objects.uids = [];
    objects.classes = [];
    $('.node').attr('class','node node_effect_good');
    $('.ens').attr('class','ens ens_effect_good');

    /** On click and not drag. */
    $('#netgraph').on('mousedown', function (event) {
        if(event.button == 2){
            return;
        }
        $('#netgraph').on('mouseup mousemove', function(evt) {
            if (evt.type === 'mouseup') {
                    cur_obj = $($(event.target).parent()[0]);
                    obj_class = cur_obj.attr('class').split(" ")[0];
                    obj_name = cur_obj.attr('data-id');

                    /** Adds first part of potential connection if
                    *   it is an ensemble or node. */
                    if(obj_class != null && (obj_class == 'ens' ||
                        obj_class == 'node')){
                            objects.uids.push(obj_name);
                            objects.classes.push(obj_class);

                    }
                    /** Cancels connection if misclicked. */
                    else if (objects.uids.length == 1){
                        self.unselct_component();
                        return;
                    }

                    if(objects.uids.length == 1){
                        $('.node').attr('class','node node_effect_bad');
                    }

                    if(objects.uids.length == 1){
                        var obj_pos;
                        var over_obj_pos;
                        var over_obj_svg;
                        var over_obj_name;
                        var over_obj_class;
                        var rel_pos = [];
                        $("#main").on('mousemove',function(event){
                            /** Updates cursor connection line's
                            *   position. */
                            obj_pos = ng.svg_objects[objects.uids[0]].get_screen_location();
                            over_obj_svg = $($(event.target).parent()[0]);
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
                                $(".temp_line").attr('x2',(event.pageX-$(this).offset().left));
                                $(".temp_line").attr('y2',((event.pageY-$(this).offset().top)));
                            }
                        });
                    }
                    if(objects.uids.length == 2) {
                        /** Completes Connection, adds appropriate
                        *   code to editor and resets line. */
                        self.add_connection(objects.uids[0],objects.uids[1]);
                        objects = {};
                        objects.uids = [];
                        objects.classes = [];
                        $("#main").unbind('mousemove');
                        $(".temp_group").remove();
                        $('.node').attr('class','node node_effect_good');
                        $('.ens').attr('class','ens ens_effect_good');
                        self.create_dash_line();
                    }
            }
            $('#netgraph').off('mouseup mousemove');
        });
    });
}

Nengo.VPL.prototype.unselct_component = function(type){
    var ng = Nengo.netgraph;
    this.toggle_item_drag(true);

    $(".mode").attr('class','mode off');
    $('#netgraph').css('cursor','');
    $('.node').attr('class','node');
    $('.ens').attr('class','ens');
    $('#netgraph').unbind('mousedown');
    $('#netgraph').unbind('click');
    $(".temp_group").remove();
    $("#main").unbind('mousemove');
    $(document).unbind('mousedown');
    var element = document.getElementById('main');
    element.style['box-shadow'] = "";


    if(ng.svg_objects["cursor.Node"] != null){
        ng.on_message({"data":JSON.stringify({"type":"remove","uid":"cursor.Node"})});
    } else if(ng.svg_objects["cursor.Ensemble"] != null){
        ng.on_message({"data":JSON.stringify({"type":"remove","uid":"cursor.Ensemble"})});
    } else if(ng.svg_objects["cursor.Network"] != null){
        ng.on_message({"data":JSON.stringify({"type":"remove","uid":"cursor.Network"})});
    }
}

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

    var component_code = "nengo.Connection("+obj1+", "+obj2+")\n";
    if (dim_out > dim_in){
        component_code = "nengo.Connection("+obj1+"[:"+dim_in+"], "+obj2+")\n";
    } else if (dim_out < dim_in) {
        component_code = "nengo.Connection("+obj1+", "+obj2+"[:"+dim_out+"])\n";
    }

    if(dim_in != 0){
        var tab = "    ";
        var editor = ace.edit('editor');
        var last_line = editor.session.getLength();

        editor.gotoLine(last_line);
        editor.insert(tab + component_code);
    }
}

Nengo.VPL.prototype.add_component = function(type, info) {
    var tab = "    ";
    var ng = Nengo.netgraph;
    var editor = ace.edit('editor');
    var last_line = editor.session.getLength();
    var obj_names = ng.svg_objects;
    var size = []
    var component_code = "";
    var component_name = "";
    var code_str = "";
    var name_switch = {"Ensemble":"ensemble","Node":"node","Network":"network"};
    var parent_net = ng.svg_objects[info.parent_network];

    if(info.parent_network == "" || info.parent_network == "cursor.Network"){
        component_name = this.open_name(name_switch[type]);
    } else{
        component_name = this.open_name(info.parent_network+"."+name_switch[type]);
    }

    if (type == "Ensemble") {
        code_str = " = nengo.Ensemble(n_neurons=50, dimensions=1)\n";
    } else if (type == "Node") {
        code_str = " = nengo.Node([0])\n";
    } else if (type == "Network") {
        code_str = " = nengo.Network()\n";
    }
    component_code = component_name + code_str;
    ng.override_sizes[component_name] = info.size;
    ng.override_positions[component_name] = info.pos;
    console.log(info.size+" "+info.pos);
    if(info.parent_network == "" || info.parent_network == "cursor.Network"){
        editor.gotoLine(last_line);
        editor.insert(tab + component_code);
    } else{
        var selection = editor.find("with "+info.parent_network+":");
        if(selection != null){
            editor.replace("with "+info.parent_network+":\n"+tab+tab+
                        component_code.substring(0,component_code.length-1));
        } else{
            editor.gotoLine(last_line);
            editor.insert(tab+"with "+info.parent_network+":\n"+tab+tab+
                        component_code+tab+tab+"pass\n");
        }
    }
    return component_name;
}

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

Nengo.VPL.prototype.compute_size = function(type,event){
    var ng = Nengo.netgraph;
    var size = [];
    var parent_net = ng.svg_objects[event.parent_network];
    var component_size = event.component_size;
    var parent_size = [];
    if(component_size == null){
        if (type == "Ensemble") {
            size= [0.06/ng.scale,0.05/ng.scale];
        } else if (type == "Node") {
            size = [0.03/ng.scale,0.05/ng.scale];
        } else if (type == "Network") {
            size = [0.1/ng.scale,0.18/ng.scale];
        }
    }else{
        size = [component_size[0],component_size[1]];
    }
    if(event.parent_network != "" && event.parent_network != "cursor.Network"){
        size= [size[0]/2,size[1]/2];
        parent_size = this.compute_network_size(parent_net);
        size = [size[0]/parent_size[0],size[1]/parent_size[1]];
    }
    return size;
}

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

Nengo.VPL.prototype.toggle_item_drag = function(toggle){
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

Nengo.VPL.prototype.delete_component = function(uid){
    var editor = ace.edit("editor");
    var re = new RegExp("(?:[^\.])"+uid+"\\s*=");
    var component = Nengo.netgraph.svg_objects[uid];
    var start_with,end_with,net_children;
    var self = this;

    this.delete_connections(uid);
    var code_line = editor.find(re);
    console.log(re);
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
    var editor = ace.edit("editor");
    var re = new RegExp("nengo\.Connection\s*.*(?:[^\.])"+uid)
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
