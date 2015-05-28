import time
import pkgutil
import os
import os.path
import mimetypes
import json

try:
    from urllib import unquote
except ImportError:
    from urllib.parse import unquote

import nengo_viz.swi as swi


class Server(swi.SimpleWebInterface):
    """Web server interface to nengo_viz"""

    def swi_browse(self, dir):
        self.script_path = '.'
        if self.user is None: return
        r = ['<ul class="jqueryFileTree" style="display: none;">']
        d = unquote(dir)
        for f in sorted(os.listdir(os.path.join(self.script_path, d))):
            ff = os.path.relpath(os.path.join(self.script_path, d,f), self.script_path)
            if os.path.isdir(os.path.join(self.script_path, d, ff)):
                r.append('<li class="directory collapsed"><a href="#" rel="%s/">%s</a></li>' % (ff,f))
            else:
                e = os.path.splitext(f)[1][1:] # get .ext and remove dot
                if e == 'py':
                    r.append('<li class="file ext_%s"><a href="#" rel="%s">%s</a></li>' % (e,ff,f))
        r.append('</ul>')
        return ''.join(r)

    def swi_static(self, *path):
        """Handles http://host:port/static/* by returning pkg data"""
        fn = os.path.join('static', *path)
        mimetype, encoding = mimetypes.guess_type(fn)
        data = pkgutil.get_data('nengo_viz', fn)
        return (mimetype, data)

    def swi_favicon_ico(self):
        icon = pkgutil.get_data('nengo_viz', 'static/favicon.ico')
        return ('image/ico', icon)

    def swi(self):
        """Handles http://host:port/ by giving the main page"""
        # create a new simulator
        viz_sim = self.viz.create_sim()

        #TODO: handle multiple viz_sims at the same time
        Server.viz_sim = viz_sim

        # read the template for the main page
        html = pkgutil.get_data('nengo_viz', 'templates/page.html')
        if isinstance(html, bytes):
            html = html.decode("utf-8")

        # fill in the javascript needed and return the complete page
        components = viz_sim.create_javascript()
        return html % dict(components=components)

    def swi_shutdown(self, *path):
        self.stop()
        return "Shutting down..."

    def ws_viz_component(self, client, uid):
        """Handles ws://host:port/viz_component with a websocket"""
        # figure out what component is being connected to

        viz_sim = Server.viz_sim

        component = viz_sim.uids[uid]
        try:
            while True:
                if viz_sim.finished:
                    break
                if viz_sim.uids[uid] != component:
                    component.finish()
                    component = viz_sim.uids[uid]
                # read all data coming from the component
                msg = client.read()
                while msg is not None:
                    if msg.startswith('config:'):
                        cfg = json.loads(msg[7:])
                        old_cfg = {}
                        for k in component.template.config_params.keys():
                            v = getattr(self.viz.config[component.template], k)
                            old_cfg[k] = v
                        if not(cfg == old_cfg):
                            # Register config change to the undo stack
                            self.viz_sim.config_change(component, cfg, old_cfg)
                        for k, v in cfg.items():
                            setattr(self.viz.config[component.template], k, v)
                        self.viz.modified_config()
                    elif msg.startswith('remove'):
                        if msg != 'remove_undo':
                            # Register graph removal to the undo stack
                            self.viz_sim.remove_graph(component)
                        self.viz.remove_uid(uid)
                        self.viz.modified_config()
                    else:
                        component.message(msg)
                    msg = client.read()
                # send data to the component
                component.update_client(client)
                self.viz.save_config(lazy=True)
                time.sleep(0.01)
        except swi.SocketClosedError:
            # This error means the server has shut down, we should stop nicely.
            self.viz.save_config(lazy=False)
        finally:
            component.finish()
