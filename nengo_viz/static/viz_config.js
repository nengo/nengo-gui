// Original JavaScript code by Chirp Internet: www.chirp.com.au
// Please acknowledge use of this code by including this header.

VIZ.Config = function() {
    var self = this

    var modalWrapper = document.createElement('div');
    var modalWindow = document.createElement('div');
    modalWrapper.id = 'modal_wrapper';
    modalWindow.id = 'modal_window';
    modalWindow.innerHTML = '<p>Config menu</p>';
    modalWrapper.appendChild(modalWindow);
	var main = document.getElementById('main');
    main.appendChild(modalWrapper);

    console.log(modalWrapper);

    this.openModal = function(e) {
        modalWrapper.className = "overlay";
        modalWindow.style.marginTop = (-modalWindow.offsetHeight)/2 + "px";
        modalWindow.style.marginLeft = (-modalWindow.offsetWidth)/2 + "px";
        e.preventDefault ? e.preventDefault() : e.returnValue = false;

        console.log('here')
    };

    this.closeModal = function(e) {
        modalWrapper.className = "";
        e.preventDefault ? e.preventDefault() : e.returnValue = false;
    };

    this.clickHandler = function(e) {
        if(!e.target) e.target = e.srcElement;
        if(e.target.tagName == "DIV") {
          if(e.target.id != "modal_window") self.closeModal(e);
        }
    };

    this.keyHandler = function(e) {
        if(e.keyCode == 27) self.closeModal(e);
    };

    if(document.addEventListener) {
        document.getElementById("modal_open").addEventListener('click', 
                self.openModal);
        document.addEventListener("click", self.clickHandler, false);
        document.addEventListener("keydown", self.keyHandler, false);
    } 
    else {
        document.getElementById("modal_open").attachEvent("onclick", 
                self.openModal);
        document.attachEvent("onclick", self.clickHandler);
        document.attachEvent("onkeydown", self.keyHandler);
    }
};



>>>>>>> moved config out of template
