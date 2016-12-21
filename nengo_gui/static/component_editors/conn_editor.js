Nengo.VPLConfig.prototype.init_conn = function(uid){
    this.uid = uid;
    this.component = Nengo.netgraph.svg_conns[uid];
    this.dim_in = this.component.pre.dimensions;
    this.dim_out = this.component.post.dimensions;
    this.functions = {}
    this.conn_sliders = {};
    this.functions['Identity'] = "";
    this.$conn_form =  $('<form id="connModalForm">'+
        '<p>Input: <button id="pre_conn" type="button" class="btn btn-default">'+
        '<b>'+this.component.pre.uid+'</b>'+
        '</button>'+
        '</p>'+
        '<p>Output: <button id="post_conn" type="button" class="btn btn-default">'+
        '<b>'+this.component.post.uid+'</b>'+
        '</button>'+
        '</p>'+
        '<p>Select a function</p>'+
        '<select class="form-control" id="function_type">'+
        '</select>'+
        '<br/>'+
        '<button id="new_func" type="button" class="btn btn-default">Create function</button>'+
        '<br/>'+
        '<div id="editor2"></div>'+
        '<div class="row" style="height:300px">'+
        '<div class="col-md-1"><div id="index_in_slider"></div></div>'+
        '<div class="col-md-6"><div id="dim_graph_container"></div></div>'+
        '<div class="col-md-2"><div id="index_out_slider"></div></div>'+
        '</div>'+

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
    options_in = {
        orientation:"vertical",
        ticks:[1],
        id:"ind_in"
    };
    options_out = {
        orientation:"vertical",
        ticks:[1,2,3],
        id:"ind_out"
    }
    self.conn_sliders['in'] = new Slider("#index_in_slider", options_in);
    self.conn_sliders['out'] = new Slider("#index_out_slider", options_out);
    $("#ind_in").height((options_in.ticks.length-1)*25 + 10)
    $("#ind_out").height((options_out.ticks.length-1)*25)
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
    $("#pre_conn").click(function(){
        $('#OK').attr('data-dismiss', 'modal');
        self.ensemble_config($(this).text());
    })
    $("#post_conn").click(function(){
        $('#OK').attr('data-dismiss', 'modal');
        self.ensemble_config($(this).text());
    })
    $('.index-input').on('input',function(e){
        if($(this).data("lastval")!= $(this).val()){
        $(this).data("lastval",$(this).val());
           //change action
           self.create_slice();
        };
    });
    self.create_slice();
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
    // $("#dim_graph_container").parent().empty();
    $("<center><h3>R<sup>"+c1.length+"</sup> -> R<sup>"+c2.length+"</sup></h3></center>")
        .appendTo($("#dim_graph_container").parent());
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

    // $(".conn_node").one("click",function(){
    //     if($(this).attr("class").indexOf("active") != -1){
    //         $(this).attr("class",
    //             $(this).attr("class").replace("active","closed")
    //         );
    //     } else{
    //         $(this).attr("class",
    //             $(this).attr("class").replace("closed","active")
    //         );
    //     }
    //     var conn_in = $(".conn_node.in.active").map(function(){
    //         return parseInt($(this).attr("data-num"),10);
    //     }).get();
    //     var conn_out = $(".conn_node.out.active").map(function(){
    //         return parseInt($(this).attr("data-num"),10);
    //     }).get();
    //     self.dimension_graph(conn_in,conn_out);
    // });
}

Nengo.VPLConfig.prototype.create_slice = function(){
    var self = this;
    var indicies = [];
    var list,start,end,jump;
    var dims = [self.dim_in,self.dim_out];
    indicies[0] = $("#conn_in_index > input").map(function(item){
        return parseInt($(this).val());
    }).get();
    indicies[1] = $("#conn_out_index > input").map(function(item){
        return parseInt($(this).val());
    }).get();

    for(var pos in indicies){
        list = []
        start = indicies[pos][0];
        end = indicies[pos][1];
        jump = indicies[pos][2];
        isNaN(start) == true ? (start=0) : (start=start)
        isNaN(end) == true ? (end=dims[pos]): (end=end)
        isNaN(jump) ==  true ? (jump=1) : (jump=jump)
        for(var x = start; x < end; x+= jump){
            list.push(x+1);
        }
        indicies[pos] = list;
     //    console.log(indicies);
    }
    self.dimension_graph(indicies[0],indicies[1]);
}
