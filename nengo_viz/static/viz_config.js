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
	//button.style.height = 10;
	//button.style.width = 10;
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
/*
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

