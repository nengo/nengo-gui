import os
import warnings

import nengo

import nengo_gui.sim
import nengo_gui.server

class SimServer(object):
    def __init__(self, filename=None, model=None, locals=None,
                 cfg=None, interactive=True, allow_file_change=True,
                 backend='nengo'):

        # no starting a SimServer inside a script inside a SimServer
        if nengo_gui.monkey.is_executing():
            raise nengo_gui.monkey.StartedVizException()

        self.sims = []
        self.component_uids = {}

        self.finished = False

        if filename is None and model is None:
            filename = os.path.join(nengo_gui.__path__[0],
                                    'examples',
                                    'default.py')
        if filename is not None:
            filename = os.path.relpath(filename)

        if model is None and locals is not None:
            model = locals.get('model', None)

        self.filename = filename
        self.model = model
        self.locals = locals
        self.allow_file_change = allow_file_change
        self.filename_cfg = cfg
        self.interactive = interactive
        self.backend = backend

    def start(self, port=8080, browser=True, password=None):
        """Start the web server"""
        print("Starting nengo_gui server at http://localhost:%d" % port)
        if password is not None:
            nengo_gui.server.Server.add_user('', password)
            addr = ''
        else:
            addr = 'localhost'
        nengo_gui.server.Server.start(self, port=port, browser=browser,
                                      addr=addr)

    def prepare_server(self, viz, port=8080, browser=True):
        return nengo_gui.server.Server.prepare_server(
            self, port=port, browser=browser)

    def begin_lifecycle(self, server):
        nengo_gui.server.Server.begin_lifecycle(
            server, interactive=self.interactive)

    def create_sim(self, filename, reset_cfg=False):
        """Create a new Simulator with this configuration"""
        sim = nengo_gui.sim.Sim(self, filename=filename, reset_cfg=reset_cfg)
        self.sims.append(sim)
        return sim

    def remove_sim(self, sim):
        self.sims.remove(sim)

    def count_sims(self):
        return len(self.sims)


class Viz(SimServer):
    def __init__(self, *args, **kwargs):
        warnings.warn("nengo_gui.Viz is deprecated.  "
                      "Use nengo_gui.SimServer instead.")
        super(Viz, self).__init__(*args, **kwargs)
