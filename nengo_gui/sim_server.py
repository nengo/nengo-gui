from __future__ import print_function

import os
import warnings

import nengo_gui.sim
import nengo_gui.server


class SimServer(object):
    """The master server object for running nengo_gui.

    Parameters
    ----------

    filename : str, optional
        Name of the default file to open when the gui starts.  If this is
        None and the model is also None, the default is 'examples/default.py'
        in the installation directory.
    model : nengo.Network, optional
        The nengo.Network to show.  If this is None, the model will be taken
        from locals['model'] (if locals is not None) or from executing the
        file given by filename
    locals : dict, optional
        The locals() dictionary after defining the model.  If this is not
        None, it will be used to help find readable labels for all the
        components of the model.  Otherwise, the resulting locals()
        dictionary after executing the script given by filename will be used.
    cfg : str, optional
        The filename to use for the config file.  If this is None, the
        default of filename + '.cfg' will be used.
    interactive : bool, optional
        If this is False, the nengo_gui is running inside some other system,
        such as IPython notebook.  The server will not automatically shut
        down, error messages will not be printed, and the code editor will
        not be shown.
    allow_file_change : bool, optional
        If this is False, the "open file" button will be disabled.
    backend : str, optional
        The default backend to use.
    """

    def __init__(self, filename=None, model=None, locals=None,
                 cfg=None, interactive=True, allow_file_change=True,
                 backend='nengo'):

        # no starting a SimServer inside a script inside a SimServer
        if nengo_gui.monkey.is_executing():
            raise nengo_gui.monkey.StartedVizException()

        # the list of running Sim objects
        self.sims = []

        # a mapping from uids to Components for all running Sims.
        # this is used to connect the websockets to the appropriate Component
        self.component_uids = {}

        # should the SimServer shut down
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

    def prepare_server(self, port=8080, browser=True):
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
