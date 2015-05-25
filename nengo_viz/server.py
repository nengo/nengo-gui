import time
import pkgutil
import os
import mimetypes
import json

import nengo_viz.swi as swi


class Server(swi.SimpleWebInterface):
    """Web server interface to nengo_viz"""

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
        try:
            while True:
                component = self.viz_sim.uids[uid]
                # read all data coming from the component
                msg = client.read()
                while msg is not None:
                    if msg.startswith('config:'):
                        cfg = json.loads(msg[7:])
                        for k, v in cfg.items():
                            setattr(self.viz.config[component.template], k, v)
                        self.viz.modified_config()
                    elif msg == 'remove':
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
