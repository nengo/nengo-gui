import time
import pkgutil
import os

import swi

class Server(swi.SimpleWebInterface):
    def swi_static(self, *path):
        fn = os.path.join('static', *path)
        if fn.endswith('.js'):
            mimetype = 'text/javascript'
        elif fn.endswith('.css'):
            mimetype = 'text/css'
        elif fn.endswith('.png'):
            mimetype = 'image/png'
        elif fn.endswith('.gif'):
            mimetype = 'image/gif'
        else:
            raise Exception('unknown extenstion for %s' % fn)

        data = pkgutil.get_data('nengo_viz', fn)
        return (mimetype, data)

    def swi(self):
        html = pkgutil.get_data('nengo_viz', 'templates/page.html')
        components = self.viz.create_javascript()
        return html % dict(components=components)

    def ws_viz_component(self, client, id):
        component = self.viz.get_component(int(id))

        while True:
            msg = client.read()
            while msg is not None:
                component.message(msg)
                msg = client.read()

            component.update_client(client)
            time.sleep(0.01)
