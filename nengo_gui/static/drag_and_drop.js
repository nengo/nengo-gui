//Setting Click handlers for toggle buttons
$("#mode_list").height($(document).height()*0.85);

$(document).keyup(function(e) {
  if (e.keyCode === 27) unselct_component();   // esc
});

$("#Node").on('click',function(){
    component_toggle('Node');
});

$("#Ensemble").on('click',function(){
    component_toggle('Ensemble');
});

$("#Network").on('click',function(){
    component_toggle('Network');
});

$("#Connection").on('click',function(){
    component_toggle('Connection');
});
$(document).ready(function(){

})

//Activates type mode for creating components
function component_toggle(type){
    var ng = Nengo.netgraph;
    if(interact($("#netgraph")[0]).ondragmove != null){
        drag_func = interact($("#netgraph")[0]).ondragmove;
    }
    if($("#"+type).attr('class') == 'mode off'){
        unselct_component();
        $("#"+type).attr('class','mode on');
    } else{
        unselct_component();
        return;
    }
    if($("#"+type).attr('class') == 'mode on'){


        var cur_obj = "";
        var obj_class = "";
        var obj_name = "";
        if(type != 'Connection'){
            $('#netgraph').css('cursor','crosshair','important');
            create_component(type);
        } else if(type == 'Connection'){
            $('#netgraph').css('cursor','cell','important');
            create_connection();
        }
    }
}


function create_component(type){
    var ng = Nengo.netgraph;
    var cur_obj, obj_class,obj_name;
    var cursor_uid = "cursor."+type;
    var name_convert = {"Node":"node","Ensemble":"ens","Network":"net"}
    var element = document.getElementById('main');
    element.style['box-shadow'] = "inset 0 0 30px #00FF00";
    toggle_item_drag(false);

    $(document).mousedown(function(event) {
        cur_obj = $($(event.target).parent()[0]);
        obj_class = cur_obj.attr('class');
        obj_name = cur_obj.attr('data-id');

        /** Creates cursor shape. */
        var cursor_start = compute_position(event);
        var cursor_width, cursor_height, cursor_end, final_pos, final_size;
        var mousemoved = false;

        ng.create_object({'pos':[-1000,-1000],'size':
        compute_size(type,{"parent_network":""}),'uid':cursor_uid,
        'type':name_convert[type],'parent':null,'label':""});

        var cursor_item = ng.svg_objects[cursor_uid];
        cursor_item.shape.style['fill-opacity'] = 0.4;
        cursor_item.width = 0;
        cursor_item.height = 0;
        cursor_item.x = cursor_start[0];
        cursor_item.y = cursor_start[1];

        $(document).mousemove(function(evt) {

            mousemoved = true;

            cursor_end = compute_position(evt);
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
                        obj_prop.pos = compute_position({"parent_network":event.parent_network,
                        "component_pos":final_pos});
                        obj_prop.size = compute_size(type,{"parent_network":event.parent_network,
                        "component_size":final_size});
                        obj_prop.parent_network = event.parent_network;

                        var comp_name = add_component(type,obj_prop);
                        var checkExist = setInterval(function() {
                           if (ng.svg_objects[comp_name] != null) {
                              toggle_item_drag(false)
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

function create_connection(){
    var cur_obj = "";
    var obj_class = "";
    var obj_name = "";
    var ng = Nengo.netgraph;
    /** Creates dashed line to signify potential connection. */
    create_dash_line();

    var objects = {};
    objects.uids = [];
    objects.classes = [];
    $('.node').attr('class','node node_effect_good');
    $('.ens').attr('class','ens ens_effect_good');

    /** On click and not drag. */
    $('#netgraph').on('mousedown', function (event) {
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
                        unselct_component();
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
                        add_connection(objects);
                        objects = {};
                        objects.uids = [];
                        objects.classes = [];
                        $("#main").unbind('mousemove');
                        $(".temp_group").remove();
                        $('.node').attr('class','node node_effect_good');
                        $('.ens').attr('class','ens ens_effect_good');
                        create_dash_line();
                    }
            }
            $('#netgraph').off('mouseup mousemove');
        });
    });
}

function unselct_component(type){
    var ng = Nengo.netgraph;
    toggle_item_drag(true);

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

function add_connection(objects){
    var ng = Nengo.netgraph;
    var item1 = ng.svg_objects[objects.uids[0]];
    var item2 = ng.svg_objects[objects.uids[1]];
    var dim_out = item1.dimensions;
    var dim_in = 0;

    if(objects.classes[1] == "node" && item2.passthrough == null){
        dim_in = 0;
    } else{
        dim_in = item2.dimensions;
    }

    var component_code = "nengo.Connection("+objects.uids[0]+", "+objects.uids[1]+")\n";
    if (dim_out > dim_in){
        component_code = "nengo.Connection("+objects.uids[0]+"[:"+dim_in+"], "+objects.uids[1]+")\n";
    } else if (dim_out < dim_in) {
        component_code = "nengo.Connection("+objects.uids[0]+", "+objects.uids[1]+"[:"+dim_out+"])\n";
    }

    if(dim_in != 0){
        var tab = "    ";
        var editor = ace.edit('editor');
        var last_line = editor.session.getLength();

        editor.gotoLine(last_line);
        editor.insert(tab + component_code);
    }
}

function add_component(type, info) {
    var tab = "    ";
    var ng = Nengo.netgraph;
    var editor = ace.edit('editor');
    var last_line = editor.session.getLength();
    var obj_names = ng.svg_objects;
    var size = []
    var component_code = "";
    var component_name = "";
    var code_str = "";
    var name_switch = {"Ensemble":"ensemble","Node":"node","Network":"network"}
    var parent_net = ng.svg_objects[info.parent_network];

    if(info.parent_network == "" || info.parent_network == "cursor.Network"){
        component_name = open_name(name_switch[type]);
    } else{
        component_name = open_name(info.parent_network+"."+name_switch[type]);
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
                        component_code);
        }
    }
    return component_name;
}

function compute_position(event) {
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
        var parent_size = compute_network_size(parent);
        parent.expand();
        parent_pos[0] = (parent.get_screen_location()[0] - offsetX)/w;
        parent_pos[1] = (parent.get_screen_location()[1] - offsetY)/h;
        pos[0] = ((pos[0] - parent_pos[0])/parent_size[0] + 1)/2;
        pos[1] = ((pos[1] - parent_pos[1])/parent_size[1] + 1)/2;
    }
    return pos;
}

function compute_size(type,event){
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
        parent_size = compute_network_size(parent_net);
        size = [size[0]/parent_size[0],size[1]/parent_size[1]];
    }
    return size;
}

function compute_network_size(parent_net){
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

function open_name(name) {
    var num = 1;
    var editor = ace.edit('editor');
    while (editor.find(name + num + " =") != null) {
        num ++;
    }
    return name + num;
}


function create_dash_line(){
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

function toggle_item_drag(toggle){
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

function delete_component(uid){

}
