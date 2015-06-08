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

import nengo_gui.swi as swi
import nengo_gui


class Server(swi.SimpleWebInterface):
    """Web server interface to nengo_gui"""

    def swi_browse(self, dir):
        if self.user is None: return
        r = ['<ul class="jqueryFileTree" style="display: none;">']
        d = unquote(dir)
        ex_tag = '//examples//'
        ex_html = '<em>built-in examples</em>'
        if d == '.':
            r.append('<li class="directory collapsed examples_dir">'
                     '<a href="#" rel="%s">%s</a></li>' % (ex_tag, ex_html))
            path = '.'
        elif d.startswith(ex_tag):
            path = os.path.join(nengo_gui.__path__[0],
                                'examples', d[len(ex_tag):])
        else:
            path = os.path.join('.', d)

        for f in sorted(os.listdir(path)):
            ff = os.path.relpath(os.path.join(path, f), '.')
            ff = os.path.join(path, f)
            if os.path.isdir(os.path.join(path, f)):
                r.append('<li class="directory collapsed">'
                         '<a href="#" rel="%s/">%s</a></li>' % (ff,f))
            else:
                e = os.path.splitext(f)[1][1:] # get .ext and remove dot
                if e == 'py':
                    r.append('<li class="file ext_%s">'
                             '<a href="#" rel="%s">%s</a></li>' % (e,ff,f))
        r.append('</ul>')
        return ''.join(r)

    def swi_static(self, *path):
        """Handles http://host:port/static/* by returning pkg data"""
        fn = os.path.join('static', *path)
        mimetype, encoding = mimetypes.guess_type(fn)
        data = pkgutil.get_data('nengo_gui', fn)
        return (mimetype, data)

    def swi_favicon_ico(self):
        icon = pkgutil.get_data('nengo_gui', 'static/favicon.ico')
        return ('image/ico', icon)

    def create_login_form(self):
        if self.attempted_login:
            message = 'Invalid password. Try again.'
        else:
            message = 'Enter the password:'
        return """<form action="/" method=GET>%s<br>
            <input type=hidden name=swi_id value=''>
            <input type=password name=swi_pwd>
            <input type=submit value="Log In">
            </form>""" % message

    def swi(self, filename=None, reset=None):
        """Handles http://host:port/ by giving the main page"""
        if self.user is None:
            return self.create_login_form()

        if reset == 'True':
            self.server.viz.load(self.server.viz.filename,
                self.server.viz.model, self.server.viz.orig_locals,
                reset=True)
        elif filename is not None:
            self.server.viz.load(filename, force=True)

        # create a new simulator
        viz_sim = self.server.viz.create_sim()

        #TODO: handle multiple viz_sims at the same time
        self.server.viz_sim = viz_sim

        # read the template for the main page
        html = pkgutil.get_data('nengo_gui', 'templates/page.html')
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

        viz_sim = self.server.viz_sim

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
                            v = getattr(
                                self.server.viz.config[component.template], k)
                            old_cfg[k] = v
                        if not(cfg == old_cfg):
                            # Register config change to the undo stack
                            self.server.viz_sim.config_change(
                                component, cfg, old_cfg)
                        for k, v in cfg.items():
                            setattr(
                                self.server.viz.config[component.template],
                                k, v)
                        self.server.viz.modified_config()
                    elif msg.startswith('remove'):
                        if msg != 'remove_undo':
                            # Register graph removal to the undo stack
                            self.server.viz_sim.remove_graph(component)
                        self.server.viz.remove_uid(uid)
                        self.server.viz.modified_config()
                        return
                    else:
                        component.message(msg)
                    msg = client.read()
                # send data to the component
                component.update_client(client)
                self.server.viz.save_config(lazy=True)
                time.sleep(0.01)
        except swi.SocketClosedError:
            # This error means the server has shut down, we should stop nicely.
            self.server.viz.save_config(lazy=False)
        finally:
            component.finish()

            if isinstance(component, nengo_gui.components.SimControl):
                viz_sim.sim = None

            if client.remote_close:
                # wait a moment before checking if the server should be stopped
                time.sleep(2)

                # if there are no simulations left, stop the server
                if isinstance(component, nengo_gui.components.SimControl):
                    if self.server.viz.count_sims() == 0:
                        if self.server.viz.interactive:
                            print(
                                "No connections remaining to the nengo_gui "
                                "server.")
                        self.server.shutdown()

    def log_message(self, format, *args):
        # suppress all the log messages
        pass
