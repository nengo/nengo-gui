 /*
 * Radio button input panel
 * @constructor
 *
 * @param {dict} args - A set of constructor arguments (see Nengo.Component)
 * @param {array} args.options - An array of options to be displayed as radio input (they must all be unique)
 * @param {boolean} args.only_one - Specifies if more then one radio input can be selected at a time
*/

Nengo.Radio = function () {
	//Nengo.Component.call(this, parent, args);
	var args = {};
	var self = this;
	this.div = document.createElement('div');
	args.options = ['hallo', 'hi again']
	for (var i = 0; i < args.options.length; i++) {
		this.div.appendChild(this.make_button(args.options[i]));
	}
	document.getElementById('main').appendChild(this.div);
}

Nengo.Radio.prototype.make_button = function(button_label) {
	var button = document.createElement('input');
	button.type = 'radio';
	button.id = button_label;
	var label = document.createElement('label');
	label.for = button_label;
	label.innerHTML = button_label;
	button.onclick = function () {alert('aiosfdjhiodajf')};
	return button
};

new Nengo.Radio();