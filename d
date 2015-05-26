diff --git a/nengo_viz/static/viz.js b/nengo_viz/static/viz.js
index 1d8d3b2..aafe644 100644
--- a/nengo_viz/static/viz.js
+++ b/nengo_viz/static/viz.js
@@ -156,6 +156,7 @@ VIZ.Component = function(parent, args) {
     this.menu = new VIZ.Menu(self.parent);
     interact(this.div)
         .on('tap', function(event) {
+            console.log("this is launching the menu");
             if (event.button == 0) {
                 if (self.menu.visible_any()) {
                     self.menu.hide_any();
diff --git a/nengo_viz/static/viz_menu.js b/nengo_viz/static/viz_menu.js
index 04c7902..6051f20 100644
--- a/nengo_viz/static/viz_menu.js
+++ b/nengo_viz/static/viz_menu.js
@@ -38,7 +38,8 @@ VIZ.Menu.prototype.show = function (x, y, items) {
      * clicked on, we need the menu's zIndex to be very large
      * TODO: change this to be one more than the highest existing zIndex
      */
-    this.menu.style.zIndex = "999999999";
+    VIZ.max_zindex++;
+    this.menu.style.zIndex = VIZ.max_zindex;
     this.div.appendChild(this.menu);
 
     VIZ.set_transform(this.menu, x - 20, y - 20);
diff --git a/nengo_viz/static/viz_slider.js b/nengo_viz/static/viz_slider.js
index 39868ff..39ef8c4 100644
--- a/nengo_viz/static/viz_slider.js
+++ b/nengo_viz/static/viz_slider.js
@@ -35,10 +35,14 @@ VIZ.Slider = function(parent, args) {
         slider.value = args.start_value[i];
 
         /** Show the slider Value */
-        var valueDisplay = document.createElement('p');
+        var valueDisplay = document.createElement('div');
         valueDisplay.classList.add('unselectable')
         valueDisplay.innerHTML = slider.value;
         slider.div.appendChild(valueDisplay);
+        this.value_display = valueDisplay
+        $(valueDisplay).tap(function(e) {
+            e.stopPropagation();
+        });
 
         /** put the slider in the container */
         slider.div.style.position = 'fixed';
@@ -212,12 +216,30 @@ VIZ.Slider.prototype.generate_menu = function() {
     var self = this;
     var items = [];
     items.push(['set range', function() {self.set_range();}]);
-    items.push(['set value', function() {self.user_value();}]);
+    items.push(['set value', function() {console.log(self); self.fill_slider_val();}]);
 
     // add the parent's menu items to this
     // TODO: is this really the best way to call the parent's generate_menu()?
     return $.merge(items, VIZ.Component.prototype.generate_menu.call(this));
 };
+/*
+$(obj).on('keypress', my_foo);
+//$(obj).on('click', this.select);
+
+function my_foo(event){
+    console.log('here')
+    if (event.which == 13) {
+        var msg = document.getElementById('in_field').value;
+        obj.innerHTML = msg
+    }
+}*/
+
+VIZ.Slider.prototype.fill_slider_val = function () {
+    console.log('here')
+    console.log(this.value_display);
+    var obj = this.value_display
+    obj.innerHTML = '<input id="in_field" value="asd"></input>';
+}
 
 VIZ.Slider.prototype.user_value = function () {
     var new_value = prompt('set value');
diff --git a/nengo_viz/templates/page.html b/nengo_viz/templates/page.html
index af23cb7..30d7765 100644
--- a/nengo_viz/templates/page.html
+++ b/nengo_viz/templates/page.html
@@ -20,9 +20,12 @@
                 %(components)s
             }
         </script>
+
+
         <script src="static/lib/js/interact-1.2.4.js"></script>
         <script src="static/lib/js/d3.v3.min.js" charset="utf-8"></script>
         <script src="static/lib/js/jquery-2.1.3.min.js"></script>
+
         <script src="static/lib/js/bootstrap.min.js"></script>
         <script src="static/viz.js"></script>
         <script src="static/viz_pan.js"></script>
diff --git a/nengo_viz/static/viz.js b/nengo_viz/static/viz.js
index 57e0806..85043da 100644
--- a/nengo_viz/static/viz.js
+++ b/nengo_viz/static/viz.js
@@ -163,7 +163,7 @@ VIZ.Component = function(parent, args) {
 };
 
 VIZ.Component.components = [];
-VIZ.save_components = function() {
+VIZ.Component.save_components = function() {
     for (var index in VIZ.Component.components) {
         VIZ.Component.components[index].save_layout();
     }
diff --git a/nengo_viz/static/viz_netgraph.js b/nengo_viz/static/viz_netgraph.js
index cd9ce62..789041d 100644
--- a/nengo_viz/static/viz_netgraph.js
+++ b/nengo_viz/static/viz_netgraph.js
@@ -92,7 +92,7 @@ VIZ.NetGraph = function(parent, args) {
 
             //scale and save components
             VIZ.scale.zoom(scale, event.clientX, event.clientY);
-            VIZ.save_components();
+            VIZ.Component.save_components();
 
             var xx = x / self.scale - self.offsetX;
             var yy = y / self.scale - self.offsetY;
