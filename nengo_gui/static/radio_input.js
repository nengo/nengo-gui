 /*
 * Radio button input panel
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {array} args.options - An array of options to be displayed as radio input (they must all be unique)
 * @param {boolean} args.only_one - Specifies if more then one radio input can be selected at a time
*/

Nengo.Radio = function (parent,sim,args) {
	Nengo.Component.call(this, parent, args);
	var self = this;
	this.sim = sim ;
	args.options = ['hallo', 'hi again']
	this.div.style.background = 'green';
	this.div.appendChild(document.createElement('br'));
	for (var i = 0; i < args.options.length; i++) {
		this.div.appendChild(this.make_button(args.options[i]));
		this.div.appendChild(document.createElement('br'));
	}
	parent.appendChild(this.div);
}

Nengo.Radio.prototype = Object.create(Nengo.Component.prototype);
Nengo.Radio.prototype.constructor = Nengo.Radio;

Nengo.Radio.prototype.make_button = function(button_label) {
	var self = this;
	var button = document.createElement('input');
	button.type = 'checkbox';
	button.id = button_label;
	var label = document.createElement('label');
	label.for = button_label;
	label.innerHTML = button_label;
	label.appendChild(button);
	button.onclick = function () {self.ws.send('sent')};
	return label
};

