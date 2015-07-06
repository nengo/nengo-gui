from __future__ import print_function 

import json
import mimetypes
import os
import os.path
import pkgutil
import time
import traceback

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

        reset_cfg = reset == 'True'

        sim = self.server.sim_server.create_sim(filename, reset_cfg=reset_cfg)

        # read the template for the main page
        html = pkgutil.get_data('nengo_gui', 'templates/page.html')
        if isinstance(html, bytes):
            html = html.decode("utf-8")

        # fill in the javascript needed and return the complete page
        components = sim.create_javascript()
        return html % dict(components=components)

    def swi_shutdown(self, *path):
        self.stop()
        return "Shutting down..."

    def ws_viz_component(self, client, uid):
        """Handles ws://host:port/viz_component with a websocket"""
        # figure out what component is being connected to

        sim_server = self.server.sim_server

        component = sim_server.component_uids[uid]
        while True:
            try:
                if sim_server.finished:
                    break
                if component.replace_with is not None:
                    component.finish()
                    component = component.replace_with
                # read all data coming from the component
                msg = client.read()
                while msg is not None:
                    if msg.startswith('config:'):
                        cfg = json.loads(msg[7:])
                        old_cfg = {}
                        for k in component.template.config_params.keys():
                            v = getattr(
                                component.sim.config[component.template], k)
                            old_cfg[k] = v
                        if not(cfg == old_cfg):
                            # Register config change to the undo stack
                            component.sim.config_change(
                                component, cfg, old_cfg)
                        for k, v in cfg.items():
                            setattr(
                                component.sim.config[component.template],
                                k, v)
                        component.sim.modified_config()
                    elif msg.startswith('remove'):
                        if msg != 'remove_undo':
                            # Register graph removal to the undo stack
                            component.sim.remove_graph(component)
                        component.sim.remove_component(component)
                        component.sim.modified_config()
                        return
                    else:
                        try:
                            component.message(msg)
                        except:
                            print('Error processing: "%s"' % msg)
                            traceback.print_exc()
                    msg = client.read()
                # send data to the component
                component.update_client(client)
                component.sim.save_config(lazy=True)
                time.sleep(0.01)
            except swi.SocketClosedError:
                # This error means the server has shut down
                component.sim.save_config(lazy=False)  # Stop nicely
                break
            except:
                traceback.print_exc()

        # After hot loop
        component.finish()

        if isinstance(component, nengo_gui.components.SimControl):
            component.sim.sim = None

        if client.remote_close:
            # wait a moment before checking if the server should be stopped
            time.sleep(2)

            # if there are no simulations left, stop the server
            if isinstance(component, nengo_gui.components.SimControl):
                if sim_server.count_sims() == 0:
                    if sim_server.interactive:
                        print("No connections remaining to the nengo_gui "
                              "server.")
                    self.server.shutdown()

    def log_message(self, format, *args):
        # suppress all the log messages
        pass
