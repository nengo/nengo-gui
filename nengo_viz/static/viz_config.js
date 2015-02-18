//args is a listof [menu option name (string) , option function]
VIZ.Config = function(args) {
	//Create the div for the drop down and position it
	var dropdown = document.createElement('div');
	dropdown.style.position = 'fixed';
	dropdown.style.right = '0em';
	dropdown.classList.add('dropdown');
	
	//Create the button and put it in the div
	var button = document.createElement('button');
	button.className = "btn btn-default dropdown-toggle";
	button.type = 'button';
	button.id = 'dropdownMenu1';
	button.setAttribute('data-toggle', 'dropdown');
	button.setAttribute("aria-expanded", 'true');
	dropdown.appendChild(button);

	//Create the icon and put it in the button
	var icon = document.createElement('span');
	icon.className = "glyphicon glyphicon-menu-hamburger";
	icon.setAttribute('aria-hidden', 'true');
	icon.style.fontSize = 10;
	button.appendChild(icon);

	//create the dropdown menu and put it in the div
	var opt_list = document.createElement('ul');
	opt_list.className = 'dropdown-menu';
	opt_list.role = 'menu';
	opt_list.setAttribute('aria-labelledby', "dropdownMenu1");
	dropdown.appendChild(opt_list);

	//generate 
	for (var i = 0 ; i < args.length; i++){
		var li = document.createElement('li');
		li.setAttribute('role', 'presentation');
		opt_list.appendChild(li);

		var attr = document.createElement('a');
		attr.setAttribute('role', 'menuitem');
		attr.setAttribute('tabindex', '-1');
		attr.textContent = args[i][0];
		if (args[i][1] != undefined){
			li.addEventListener('click', args[i][1]);
		}
		li.appendChild(attr);
	}
	return dropdown;
}

VIZ.Config.plot = function(self){
    var text_toggle = function(){
        if (self.text_enabled){
            self.axis_time_end.style.display = 'none'
            self.axis_time_start.style.display = 'none'
            self.text_enabled = false;
        }
        else{
            self.axis_time_end.style.display = 'block'
            self.axis_time_start.style.display = 'block'
            self.text_enabled = true;
            self.on_resize(self.width, self.height);
        }
    }

    var full_screen = function() {  
        if (self.full_screen == false){
            var h = $(window).height();
            var w = $(window).width();
            self.old_h = self.height;
            self.old_w = self.width;
            self.old_x = self.div.getAttribute('data-x');
            self.old_y = self.div.getAttribute('data-y');
            self.on_resize(w, h);
            self.div.style.height = h;
            self.div.style.width = w;
            self.div.style.backgroundColor = 'white';
            VIZ.set_transform(self.div, 0, 0);
            self.full_screen = true;
        }
        else{
            self.div.style.height = self.old_h;
            self.div.style.width = self.old_w;
            self.on_resize(self.old_w, self.old_h);
            self.div.style.backgroundColor = 'rgba(255,0,0,0)';
            VIZ.set_transform(self.div, self.old_x, self.old_y);
            self.full_screen = false;            
        }
    }

    return VIZ.Config([
    	['Toggle Full-screen',full_screen],
    	['Toggle X_Text', text_toggle]
    	]);
}

VIZ.Config.slider = function(self, min, max) {
    var set_val = function(){
        var ind = 0
        if (self.sliders.length > 1) {
            ind = prompt("Set for which slider (0 - " + (self.sliders.length - 1) + ")");
        }

        var new_val = prompt("Set value to:");
        if (new_val == null) {
            return;
        }
        while (VIZ.is_num(new_val) == false){
            new_val = prompt("BAD INPUT - Set value to:");
            if (new_val == null) {
                return;
            }
        }
        ind = VIZ.max_min(ind, 0, self.sliders.length - 1);
        new_val = VIZ.max_min(new_val, min, max);
        self.set_value(ind, new_val);
    }
    
    return VIZ.Config([['Set Value', set_val]]);
}

/* EXAMPLE DROPDOWN 
<div class="dropdown">
  <button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">

    <span class="glyphicon glyphicon-menu-hamburger" aria-hidden="true"></span>
  </button>
  <ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu1">
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#" onclick='this_fun()'>Action</a></li>
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Another action</a></li>
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Something else here</a></li>
    <li role="presentation"><a role="menuitem" tabindex="-1" href="#">Separated link</a></li>
  </ul>
</div>
*/

