Nengo.Table = function (parent,sim,args) {
	Nengo.Component.call(this, main, args);
	this.rows = args.rows;
	this.columns = args.columns;
	this.target_cell = args.target_cell
	this.hide_label()
	this.show_label = function(){}
	this.tableCreate();
	this.table_built = false;

}

Nengo.Table.prototype = Object.create(Nengo.Component.prototype);
Nengo.Table.prototype.constructor = Nengo.Table;

Nengo.Table.prototype.tableCreate = function () {
	tbl  = document.createElement('table');
	this.table = tbl
    tbl.style.width  = '100%';
    tbl.style.height = '100%';
    tbl.style.border = "1px solid black";
    var temp_rows = this.rows.slice();
    var temp_cols = this.columns.slice();
    for(var i = 0; i <= this.rows.length; i++){
        var tr = tbl.insertRow();
        for(var j = 0; j <= this.columns.length; j++){
        	console.log(i,j);
            var td = tr.insertCell();
			if (0 == j && 0 == i) {
				td.innerHTML = this.label_text;
				td.classList.add('title_cell');
			}
            else if (j == 0) {
            	td.classList.add('title_cell');
            	td.textContent = temp_rows.shift();
            }
            else if (i == 0) {
            	td.classList.add('title_cell');
            	td.textContent = temp_cols.shift();
            }
            else {
            	td.textContent = 'Null Cell';
            }

            td.style.border = "1px solid black"

            if (this.target_cell.row + 1 == i && this.target_cell.column + 1 == j) {
            	td.style.border = "5px solid red";
            	td.textContent = 'Null Cell'
         		this.image = document.createElement('img');
				this.image.src = 'http://i.imgur.com/sU6cDN3.png?1'
				this.image.style.position = 'absolute';
            	td.appendChild(this.image)
            }
        }
    }
    this.div.appendChild(tbl);
    this.table_built = true;
}

Nengo.Table.prototype.on_message = function(event) {

	this.update_table(event);
}

Nengo.Table.prototype.update_table = function (event) {
	if (this.table_built == false) {
		var certainty = JSON.parse(event.data).data;
		var cell = this.table.getElementsByTagName('td')
		var cells = [];
		for (var i = 0; i < cell.length; i++) {
			if (!($(cell[i]).hasClass('title_cell'))) {
				cells.push(cell[i]);
			}
		}

		var finger_index = this.array_max_index(certainty);

		for (var i = 0; i < certainty.length; i++) {
			cells[i].textContent = certainty[i]
			cells[i].style.backgroundColor = this.gen_color(certainty[i])
			if (i == finger_index) {
				cells[i].appendChild(this.image);
			}

		}
	}	
}

Nengo.Table.prototype.array_max_index = function (array) {
	var current_max = array[0];
	var max_index = 0;
	for (var i = 1; i < array.length; i++) {
		if (array[i] > current_max) {
			max_index = i;
			current_max = array[i];
		}
	}
	return max_index;
}


Nengo.Table.prototype.gen_color = function(certainty) {
	var rgb_gray = 50 + certainty * 2
	return 'rgb('+rgb_gray+','+rgb_gray+','+rgb_gray+')'
}