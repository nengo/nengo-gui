/** Initiates the ensemble editor, sets parameters and creates the html.
    This is called before the modal is created */
Nengo.VPLConfig.prototype.init_ensemble = function(uid){
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

    /** An object of the neuron models and their corresponding parameters and settings*/
    this.neuron_model = {};
    this.neuron_model['LIF'] = {tau_rc: {min:0.01,max:1,default:0.02,step:0.01},
                                tau_ref: {min:0.001,max:0.01,default:0.002,step:0.001},
                            };
    this.neuron_model['Sigmoid'] = {
                            tau_ref: {min:0.001,max:0.01,default:0.002,step:0.001},
                            }

    this.graph_container = $('<div id="graph_container"></div>');
    this.graph_w = 500;
    this.radius = 1;
    this.inputs = {};
    this.uid = uid;
    for(var n_type in this.neuron_model){
        $('<option>'+n_type+'</option>').appendTo($(this.$model_form).find("#ens_model"));
    }
}

Nengo.VPLConfig.prototype.ensemble_modal = function(uid){
    var self = this;
    self.init_ensemble(uid);
    Nengo.modal.clear_body();
    Nengo.modal.show()
    Nengo.modal.title("Edit "+uid+"'s properties");;
    var tabs = Nengo.modal.tabbed_body([{id: 'params', title: 'Basic'},
                                 {id: 'model', title: 'Neuron Model'}]);
    $('<div class="form-group" id="dim_controls"></div>').prependTo(".modal-body");
    self.$param_form.appendTo(tabs.params);
    self.$model_form.appendTo(tabs.model);

    self.create_neuron_model($("#ens_model").val());
    $("#ens_model").on("change",function(){
        self.create_neuron_model(this.value);
    });

    self.create_input("#dim_controls","dimensions","Dimension","slider",{
    	min: 1,
        max: 10,
        tooltip: "hide",
        value: 1,
        step: 1,
        id: "dimensionsC",
        group: "basic"
    });
    self.create_input("#param_controls","radius","Radius","slider",{
    	min: 1,
        max: 5,
        tooltip: "hide",
        value: 1,
        step: 1,
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
        step: 0.05,
        id: "interceptsC",
        group: "dists"
    });
    self.create_input("#param_controls","max_rates","Max Rates (Hz)","double_slider",{
        min: 0,
        max: 400,
        tooltip: "hide",
        value: [200,400],
        step: 5,
        id: "max_ratesC",
        group: "dists"
    });
    self.generate_graph();
}

/** parent_selector: a css selector for the parent that the input will be attached to.
    new_id: the id for the input, attaches the input to this.inputs.
    label: text for input.
    type: one of ["number","slider","double_slider"].
    options: object including settings for input and which group it belongs to */
Nengo.VPLConfig.prototype.create_input = function(parent_selector,new_id,label,type,options){
    var self = this;
    var slide_vals = []
    self.inputs[new_id] = {}
    self.inputs[new_id]['options'] = options;
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

        self.inputs[new_id]['slider'].on("slideStop",function(evt){
            if(typeof options.value == "number"){
                $(slide_vals[0]).val(evt).change();
            } else{
                $(slide_vals[0]).val(evt[0]).change();
                $(slide_vals[1]).val(evt[1]).change();
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
                self.generate_graph();
            })
        }
    }
}

/** Main function that creates modal and handles the data on submit*/
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
            , Number.MAX_VALUE), tabs+code);
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

/** Checks if sliders html is attached to the page, if not it deletes the slider
    from self.inputs */
Nengo.VPLConfig.prototype.update_input_list = function(){
    var self = this;
    for(var input in self.inputs){
        if($("#"+input+"_val_1")[0] == null){
            delete self.inputs[input];
        }
    }
}

/** Creates an object that has all of the current values from the inputs in the
    form.*/
Nengo.VPLConfig.prototype.capture_values = function(){
    var self = this;
    var values = {};
    var inputs = self.inputs;
    var neuron_model = $("#ens_model").val();

    values["neuron_type"] = neuron_model;
    values['neuron_params'] = {}

    for(var input in inputs){
        if(inputs[input].options.group == "basic"){
            var val = $("#"+input+"_val_1").val();
            // if(inputs[input].options.value != val && (input != "dimensions" || input != "n_neurons")){
                values[input] = val;
            // }
        } else if(inputs[input].options.group == "dists"){
            var vals = [$("#"+input+"_val_1").val(),$("#"+input+"_val_2").val()];
            // values[input] = "Uniform("+
            //     "low="+vals[0]+","+
            //     "high="+vals[1]+""+
            //     ")"
            values[input] = vals;
        }
        else if(inputs[input].options.group == "n_type"){
            // neuron_values.push(input+"="+$("#"+input+"_val_1").val());
            values['neuron_params'][input] = $("#"+input+"_val_1").val();
        }
    }
    // values["neuron_type"] = neuron_model+"("+neuron_values.join()+")";
    return values;
}

/** Takes the values from capture_values() and returns the appropriate code for
    an ensemble.*/
Nengo.VPLConfig.prototype.generate_code = function(){
    var self = this;
    var vals = self.capture_values();
    var props = [];
    var param_code = "";
    var inputs = self.inputs;
    var neuron_params = [];

    for(var item in vals){
        param_code = "";
        //Special Case for neuron_params
        if(item != "neuron_params" && item != "neuron_type"){
          if(inputs[item].options.group == "dists"){
              param_code = "nengo.dists."+"Uniform("+
                  "low="+vals[item][0]+","+
                  "high="+vals[item][1]+""+
                  ")"
          } else {
            param_code = vals[item];
          }
          props.push(item+"="+param_code);
        }
    }

    for(var prop in vals['neuron_params']){
      neuron_params.push(prop+"="+vals['neuron_params'][prop])
    }
    param_code = "nengo."+vals['neuron_type']+"("+neuron_params.join()+")";
    props.push("neuron_type"+"="+param_code)

    return self.uid+" = "+"nengo.Ensemble("+props.join(', ')+")";
}

/** Makes a call to the server to create the appropriate tuning or response curves
    for the given parameters of the form.*/
Nengo.VPLConfig.prototype.generate_graph = function(){
    var self = this;
    var server_response = $.get( "/generate_curves",
                {code:this.generate_code(),
                name:this.uid});

    $.ajax({
        url: "/generate_curves",
        type: 'GET',
        dataType:'text',
        data:{name:self.uid,code:self.generate_code()},
        success: function(res) {
            /* The Response from the server uses single quotes instead of double quotes
               this has to be switched before json can parse the string */
            var plot_info = JSON.parse(res.split("'").join('"'));
            self.redraw_graph("#graph_container",plot_info.x,plot_info.y,
                                plot_info.x_label,plot_info.y_label,plot_info.title);
        }
    });
}

// Nengo.VPLConfig.prototype.set_form_inputs(values) = function(){
//     for(inputs in self.inputs){
//
//     }
// }
/** Creates the form inputs for a given type of neuron_model */
Nengo.VPLConfig.prototype.create_neuron_model = function(neuron_type){
    var self = this;
    var value = neuron_type;
    $("#model_controls").empty()

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
}

Nengo.VPLConfig.prototype.set_inputs = function(info){
    var self = this;
    var vals;
    $("#ens_model").val(info["neuron_type"]);
    for(var item in info){
        vals = [];
        if(item != "neuron_type"){
            console.log(item);
            console.log(info[item]);
            console.log();
            if(item == "neuron_params"){
                for(var param in info["neuron_params"]){
                    vals = [info["neuron_params"][param]].map(function(value){
                        return parseFloat(value,10);
                    })
                    $("#"+param+"_val_1").val(vals[0]);
                    self.inputs[param]["slider"].setValue(vals[0]);
                }
            }
            else if(typeof(info[item]) == "object"){
                vals = info[item].map(function(value){
                    return parseFloat(value,10);
                })
                $("#"+item+"_val_1").val(vals[0]);
                $("#"+item+"_val_2").val(vals[1]);
                self.inputs[item]["slider"].setValue(vals);
            } else{
                vals = [info[item]].map(function(value){
                    return parseFloat(value,10);
                })
                $("#"+item+"_val_1").val(vals[0]);
                self.inputs[item]["slider"].setValue(vals[0]);
            }
        }
    }
    self.generate_graph();
}
/** Empties container for the graph and replaces it with a new graph */
Nengo.VPLConfig.prototype.redraw_graph = function(selector, x, ys, x_label, y_label, title){
    var self = this;
    $("#graph_container > svg").remove();
    self.graph_container.prependTo(".modal-body");
    $("#graph_label").remove();
    $("<label id='graph_label'><h4>"+title+"</h4></label>").prependTo(".modal-body");
    self.multiline_plot(selector, x, ys, x_label, y_label);
}
