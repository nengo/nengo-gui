import swi

class Server(swi.SimpleWebInterface):
    serve_dirs = ['static']

    def swi(self):
        return open('index.html').read()


port = 8080
swi.browser(port=port)
swi.start(Server, port=port)
