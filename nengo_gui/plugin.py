import mimetypes
import os.path
import pkgutil

from nengo_gui import server


class Plugin(object):
    def __init__(self, name, module_name):
        self.name = name
        self.module_name = module_name

    def serve(self, resource):
        if resource.startswith('/static/'):
            return self.serve_static(resource)
        else:
            raise server.InvalidResource(resource)

    def serve_static(self, resource):
        mimetype, _ = mimetypes.guess_type(resource)
        data = pkgutil.get_data(self.module_name, resource)
        return server.HttpResponse(data, mimetype)
