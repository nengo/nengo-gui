Nengo.VPLConfig.prototype.init_ensemble = function(){
    this.$param_form =  $('<form id="ensModalForm">'+
        '<div class="form-group" id="param_controls"></div>'+
    '</form>');
    this.$model_form = $('<form id="ensModalForm">'+
        '<div class="form-group">'+
        '   <label for="ens_model">Neuron Model</label>'+
            '<select class="form-control" id="ens_model">'+
            '</select>'+
        '</div>'+
        '<div class="form-group" id="model_controls">'+
        '</div>'+
    '</form>');
    this.neuron_model = {};
    this.neuron_model['LIF'] = {tau_rc: {min:0,max:1,default:0.02,step:0.01},
                                tau_ref: {min:0,max:0.01,default:0.002,step:0.001},
                                // min_voltage: {min:0,max:10,default:0,step:1}
                            };
    this.neuron_model['Sigmoid'] = {
                            tau_ref: {min:0,max:0.01,default:0.002,step:0.001},
                            }
    this.neuron_dists = {};
    this.neuron_dists["Uniform"]
    this.graph_container = $('<div id="graph_container"></div>');
    this.graph_w = 500;
    this.radius = 1;
    this.inputs = {};

    for(var n_type in this.neuron_model){
        $('<option>'+n_type+'</option>').appendTo($(this.$model_form).find("#ens_model"));
    }
}

Nengo.VPLConfig.prototype.ensemble_modal = function(uid){
    var self = this;
    self.init_ensemble();
    Nengo.modal.clear_body();
    Nengo.modal.show()
    Nengo.modal.title("Edit "+uid+"'s properties");;
    var tabs = Nengo.modal.tabbed_body([{id: 'params', title: 'Basic'},
                                 {id: 'model', title: 'Neuron Model'}]);
    $('<div class="form-group" id="dim_controls"></div>').prependTo(".modal-body");
    self.$param_form.appendTo(tabs.params);
    self.$model_form.appendTo(tabs.model);

    $("#ens_model").on("change",function(){
        var optionSelected = $("option:selected", this);
        console.log(optionSelected);
        $("#model_controls").empty()

        var value = this.value;

        for(var item in self.neuron_model[value]){
            self.create_input("#model_controls",item,item,"slider",{
                min: self.neuron_model[value][item]['min'],
                max: self.neuron_model[value][item]['max'],
                tooltip: "hide",
                value: self.neuron_model[value][item]['default'],
                step: self.neuron_model[value][item]['step'],
                group: "n_type"
            });
        }
        self.update_input_list();
    });
    self.redraw_graph("#graph_container",[1,2,3],[[1,2,3],[4,5,6]],'radius','frequency')
    self.create_input("#dim_controls","dimensions","Dimension","number",{
    	min: 1,
        max: 10,
        tooltip: "hide",
        value: 1,
        step: 1,
        id: "dimensionsC",
        group: "basic"
    });
    self.create_input("#param_controls","radius","Radius","slider",{
    	min: 0.1,
        max: 5,
        tooltip: "hide",
        value: 1,
        step: 0.1,
        id: "radiusC",
        group: "basic"
    });
    self.create_input("#param_controls","n_neurons","Neuron #","slider",{
        min: 1,
        max: 200,
        tooltip: "hide",
        value: 50,
        step: 1,
        id: "neuron_numC",
        group: "basic"
    });
    self.create_input("#param_controls","intercepts","Intercepts","double_slider",{
        min: -1,
        max: 1,
        tooltip: "hide",
        value: [-1,1],
        step: 0.01,
        id: "interceptsC",
        group: "uniform"
    });
    self.create_input("#param_controls","max_rates","Max Rates (Hz)","double_slider",{
        min: 0,
        max: 400,
        tooltip: "hide",
        value: [200,400],
        step: 1,
        id: "max_ratesC",
        group: "uniform"
    });
}

Nengo.VPLConfig.prototype.create_input = function(parent_selector,new_id,label,type,options){
    var self = this;
    var slide_vals = []
    self.inputs[new_id] = {}
    self.inputs[new_id]['group'] = options.group;
    self.inputs[new_id]['type'] = type;
    var control_group = $('<div id="'+new_id+"_form"+'"class="controls form-inline"></div>')
        .appendTo($(parent_selector));
    var label_tag = $('<label class="col-xs-3" for="'+new_id+'">'+label+'</label>')
        .appendTo($(control_group));
    var slide_val_1 = $('<input type="number" step="'+options.step+'" class="form-control slider-val" id="'+new_id+
            '_val_1" placeholder="1">')
        .appendTo($(control_group));
    if(typeof options.value == "number"){
        slide_val_1.val(options.value);
        slide_vals[0] = slide_val_1;
    }
    if(type == "slider" || type == "double_slider"){
        var slider_input = $('<input data-provide="slider" id="'+new_id+'"/>')
            .appendTo($(control_group));
        self.inputs[new_id]['slider'] = new Slider('#'+new_id,options);

        if(typeof options.value != "number"){
            var slide_val_2 = $('<input type="number" step="'+options.step+'" class="form-control slider-val" id="'+new_id+
                    '_val_2" placeholder="1">')
                .appendTo($(control_group));
            slide_val_1.val(options.value[0]);
            slide_val_2.val(options.value[1]);
            slide_vals[0] = slide_val_1;
            slide_vals[1] = slide_val_2;
        }

        self.inputs[new_id]['slider'].on("change",function(){
            if(typeof options.value == "number"){
                $(slide_vals[0]).val(self.inputs[new_id]['slider'].getValue());
            } else{
                $(slide_vals[0]).val(self.inputs[new_id]['slider'].getValue()[0]);
                $(slide_vals[1]).val(self.inputs[new_id]['slider'].getValue()[1]);
            }
        });
        for(var x = 0; x <= 1; x++){
            $(slide_vals[x]).on("change",function(){
                var max_val = self.inputs[new_id]['slider'].getAttribute("max");
                var min_val = self.inputs[new_id]['slider'].getAttribute("min");
                var value = parseFloat($(this).val(),10);
                if (value > max_val){
                    self.inputs[new_id]['slider'].setAttribute("max",value);
                } else if (value < min_val){
                    self.inputs[new_id]['slider'].setAttribute("min",value);
                }
                self.inputs[new_id]['slider'].setValue(slide_vals.map(function(input){
                    return parseFloat($(input).val(),10)
                }));
        })
        }
    }
}

Nengo.VPLConfig.prototype.ensemble_config = function(uid){
    var self = this;
    var vpl = Nengo.vpl;
    var editor = ace.edit("editor");
    var re = new RegExp("(?:[^\.])"+uid+"\\s*=");
    var code_line = editor.find(re);
    var component = Nengo.netgraph.svg_objects[uid];
    console.log(component);
    self.ensemble_modal(uid)
    Nengo.modal.footer('ok_cancel',
        function(e) {
            var Range = require("ace/range").Range;
            var tab = "    ";
            var tabs;
            var vals = self.capture_values();
            var code = self.generate_code()
            component.dimensions = parseInt(vals['dimensions'],10);

            if(component.parent == null){tabs = tab;}
            else{tabs = tab+tab;}

            editor.session.replace(new Range(component.line_number-1, 0, component.line_number-1
            , Number.MAX_VALUE), tabs+uid+" = "+code);
            vpl.delete_connections(uid);
            var conn_in = component.conn_in;
            var conn_out = component.conn_out;
            for(var x = 0; x < conn_in.length; x++){
                vpl.add_connection(conn_in[x].pre.uid,conn_in[x].post.uid);
            }
            for(var x = 0; x < conn_out.length; x++){
                vpl.add_connection(conn_out[x].pre.uid,conn_out[x].post.uid);
            }
            $('#OK').attr('data-dismiss', 'modal');
        },
        function () {
            $('#cancel-button').attr('data-dismiss', 'modal');
        }
    );
}

Nengo.VPLConfig.prototype.update_input_list = function(){
    var self = this;
    for(var input in self.inputs){
        if($("#"+input+"_val_1")[0] == null){
            delete self.inputs[input];
        }
    }
}

Nengo.VPLConfig.prototype.capture_values = function(){
    var self = this;
    var values = {};
    var inputs = self.inputs;
    var neuron_model = $("#ens_model").val();
    var neuron_values = [];

    for(var input in inputs){
        if(inputs[input].group == "basic"){
            values[input] = $("#"+input+"_val_1").val();
        } else if(inputs[input].group == "uniform"){
            values[input] = "nengo.dists.Uniform("+
                "low="+$("#"+input+"_val_1").val()+","+
                "high="+$("#"+input+"_val_2").val()+""+
                ")"
        }
        else if(inputs[input].group == "n_type"){
            neuron_values.push(input+"="+$("#"+input+"_val_1").val());
        }
    }
    values["neuron_type"] = "nengo."+neuron_model+"("+neuron_values.join()+")";
    return values;
}

Nengo.VPLConfig.prototype.generate_code = function(){
    var self = this;
    var vals = self.capture_values();
    var props = []

    for(var item in vals){
        props.push(item+"="+vals[item]);
    }

    return "nengo.Ensemble("+props.join()+")";
}

$(document).ready(function(){
  Nengo.vpl_config = new Nengo.VPLConfig();
});
