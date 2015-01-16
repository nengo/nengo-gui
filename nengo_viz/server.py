import time
import pkgutil
import os
import mimetypes

import swi


class Server(swi.SimpleWebInterface):
    """Web server interface to nengo_viz"""

    def swi_static(self, *path):
        """Handles http://host:port/static/* by returning pkg data"""
        fn = os.path.join('static', *path)
        mimetype, encoding = mimetypes.guess_type(fn)
        data = pkgutil.get_data('nengo_viz', fn)
        return (mimetype, data)

    def swi(self):
        """Handles http://host:port/ by giving the main page"""
        # create a new simulator
        viz_sim = self.viz.create_sim()

        # read the template for the main page
        html = pkgutil.get_data('nengo_viz', 'templates/page.html')

        # fill in the javascript needed and return the complete page
        components = viz_sim.create_javascript()
        return html % dict(components=components)

    def ws_viz_component(self, client, id):
        """Handles ws://host:port/viz_component with a websocket"""
        # figure out what component is being connected to
        component = self.viz.pop_component(int(id))

        try:
            while True:
                # read all data coming from the component
                msg = client.read()
                while msg is not None:
                    component.message(msg)
                    msg = client.read()
                # send data to the component
                component.update_client(client)
                time.sleep(0.01)
        finally:
            component.finish()
