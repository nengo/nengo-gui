"""Classes to instantiate and manage the life cycle of the nengo_gui
backend."""

from __future__ import print_function

import os

import nengo_gui.page
import nengo_gui.server
from nengo_gui.backend.backend import GuiServer, ModelContext


class GUI(object):
    """The master server object for running nengo_gui.

    Parameters
    ----------
    model_context : nengo_gui.backend.backend.ModelContext
        Model and its context served by the backend.
    page_settings : nengo_gui.page.PageSettings, optional
        Frontend page settings.
    port : int
        Port to listen on.
    password : str, optional
        Password required to connect to the backend.
    """

    def __init__(self, filename=None, model=None, locals=None,
                 cfg=None, interactive=True, allow_file_change=True,
                 backend='nengo'):
        if filename is None and model is None:
            filename = os.path.join(
                nengo_gui.__path__[0], 'examples', 'default.py')
        self.model_context = ModelContext(
                model, locals, filename, allow_file_change)

    def start(self, port=8080, browser=True, password=None):
        """Start the web server"""
        print("Starting nengo server at http://localhost:%d" % port)
        if password is not None:
            nengo_gui.server.Server.add_user('', password)
            addr = ''
        else:
            addr = 'localhost'
        server = GuiServer((addr, port), self.model_context)
        server.serve_forever()
        #nengo_gui.server.Server.start(self, port=port, browser=browser,
                                      #addr=addr, interactive=self.interactive)

    def prepare_server(self, port=8080, browser=True):
        return nengo_gui.server.Server.prepare_server(
            self, port=port, browser=browser)

    def begin_lifecycle(self, server):
        nengo_gui.server.Server.begin_lifecycle(
            server, interactive=self.interactive)

    def create_page(self, filename, reset_cfg=False):
        """Create a new Page with this configuration"""
        page = nengo_gui.page.Page(self, filename=filename, reset_cfg=reset_cfg)
        self.pages.append(page)
        return page

    def remove_page(self, page):
        self.pages.remove(page)

    def count_pages(self):
        return len(self.pages)
