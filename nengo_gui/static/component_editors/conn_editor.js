Nengo.VPLConfig.prototype.init_conn = function(uid){
    this.uid = uid;
    this.component = Nengo.netgraph.svg_conns[uid];
    this.dim_in = this.component.pre.dimensions;
    this.dim_out = this.component.post.dimensions;
    this.functions = {}
    this.functions['Identity'] = "";
    this.$conn_form =  $('<form id="connModalForm">'+
        '<p>Input: <b>'+this.component.pre.uid+'</b></p>'+
        '<p>Output: <b>'+this.component.post.uid+'</b></p>'+
        '<p>Select a function</p>'+
        '<select class="form-control" id="function_type">'+
        '</select>'+
        '<br/>'+
        '<button id="new_func" type="button" class="btn btn-default">Create function</button>'+
        '<br/>'+
        '<div id="editor2"></div>'+
        '<div class="controls form-inline">'+
            '<label for="inputKey">[</label>'+
            '<input type="text" class="index-input">'+
            '<label>:</label>'+
            '<input type="text" class="index-input">'+
            '<label>:</label>'+
            '<input type="text" class="index-input">'+
            '<label>]</label>'+
            '<label for="inputKey">[</label>'+
            '<input type="text" class="index-input">'+
            '<label>:</label>'+
            '<input type="text" class="index-input">'+
            '<label>:</label>'+
            '<input type="text" class="index-input">'+
            '<label>]</label>'+
        '</div>'+
        '<div id="dim_graph_container"></div>'+
    '</form>');

    for(var f_type in this.functions){
        $('<option>'+f_type+'</option>').appendTo($(this.$conn_form).find("#function_type"));
    }
}

Nengo.VPLConfig.prototype.conn_modal = function(uid){
    var self = this;
    self.init_conn(uid);

    Nengo.modal.clear_body();
    Nengo.modal.show()
    Nengo.modal.title("Edit "+uid+"'s properties");;
    self.$conn_form.appendTo(Nengo.modal.$body);
}

Nengo.VPLConfig.prototype.conn_config = function(uid){
    var self = this;
    var vpl = Nengo.vpl;
    self.conn_modal(uid)
    var editor2 = ace.edit("editor");
    this.editor = ace.edit('editor2');
    this.editor.$blockScrolling = Infinity;
    this.editor.getSession().setMode("ace/mode/python");
    this.editor.gotoLine(1);
    this.marker = null;
    self.dimension_graph([1],[1]);
    $("#new_func").click(function(){
        $("#editor2").toggle();
    });
    Nengo.modal.footer('ok_cancel',
        function(e) {
            // var Range = require("ace/range").Range;
            // var tab = "    ";
            // var tabs;
            // var vals = self.capture_values();
            // var code = self.generate_code()
            // component.dimensions = parseInt(vals['dimensions'],10);
            //
            // if(component.parent == null){tabs = tab;}
            // else{tabs = tab+tab;}
            //
            // editor.session.replace(new Range(component.line_number-1, 0, component.line_number-1
            // , Number.MAX_VALUE), tabs+code);
            // vpl.delete_connections(uid);
            // var conn_in = component.conn_in;
            // var conn_out = component.conn_out;
            // for(var x = 0; x < conn_in.length; x++){
            //     vpl.add_connection(conn_in[x].pre.uid,conn_in[x].post.uid);
            // }
            // for(var x = 0; x < conn_out.length; x++){
            //     vpl.add_connection(conn_out[x].pre.uid,conn_out[x].post.uid);
            // }
            $('#OK').attr('data-dismiss', 'modal');
        },
        function () {
            $('#cancel-button').attr('data-dismiss', 'modal');
        }
    );
}

Nengo.VPLConfig.prototype.dimension_graph = function(c1,c2){
    var self = this;
    var component = self.component;
    var dim1 = self.dim_in;
    var dim2 = self.dim_out;
    $("#dim_graph_container").empty();
    $("<center><h3>R<sup>"+c1.length+"</sup> -> R<sup>"+c2.length+"</sup></h3></center>")
        .appendTo($("#dim_graph_container"));
    var bodySelection = d3.select("#dim_graph_container");
    var graph_w = 350;
    var graph_h = 50+Math.max(dim1,dim2)*15;
    $("#dim_graph_container").width(graph_w);
    $("#dim_graph_container").height(graph_h);
    var svgSelection = bodySelection.append("svg")
                                .attr("viewBox","0 0 "+graph_w+" "+graph_h);
    for(var x = 1; x <= dim1; x++){
        for(var y = 1; y <= dim2; y++){
            if(c1.indexOf(x) != -1 && c2.indexOf(y) != -1){
                svgSelection.append("line")
                                .attr("x1", graph_w*(1/3))
                                .attr("y1", graph_h/(dim1+1)*x)
                                .attr("x2", graph_w*(2/3))
                                .attr("y2", graph_h/(dim2+1)*y)
                                .attr("stroke-width", 1)
                                .attr("stroke", "black");
            }
        }
    }
    for(var x = 1; x <= dim1; x++){
        var class_type = "conn_node in active";
        if(c1.indexOf(x) == -1){
            class_type = "conn_node in closed";
        }
        svgSelection.append("circle")
                        .attr("cx", graph_w/3)
                        .attr("cy", graph_h/(dim1+1)*x)
                        .attr("r", 8)
                        .attr("class",class_type)
                        .attr("data-num",x);
    }
    for(var x = 1; x <= dim2; x++){
        var class_type_2 = "conn_node out active";
        if(c2.indexOf(x) == -1){
            class_type_2 = "conn_node out closed";
        }
        svgSelection.append("circle")
                        .attr("cx", graph_w*(2/3))
                        .attr("cy", graph_h/(dim2+1)*x)
                        .attr("r", 8)
                        .attr("class",class_type_2)
                        .attr("data-num",x);
    }
    $(".conn_node").one("click",function(){
        if($(this).attr("class").indexOf("active") != -1){
            $(this).attr("class",
                $(this).attr("class").replace("active","closed")
            );
        } else{
            $(this).attr("class",
                $(this).attr("class").replace("closed","active")
            );
        }
        var conn_in = $(".conn_node.in.active").map(function(){
            return parseInt($(this).attr("data-num"),10);
        }).get();
        var conn_out = $(".conn_node.out.active").map(function(){
            return parseInt($(this).attr("data-num"),10);
        }).get();
        self.dimension_graph(conn_in,conn_out);
    });
}
