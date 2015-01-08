import random
import time

import swi

class Server(swi.SimpleWebInterface):
    serve_dirs = ['static']

    def swi(self):
        return open('index.html').read()

    def ws_viz_component(self, client, id):
        while True:
            msg = client.read()
            while msg is not None:
                print id, msg
                msg = client.read()
            client.write('%g' % random.random())
            time.sleep(0.01)


Server.start(port=8080, browser=True)
