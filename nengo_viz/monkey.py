import importlib
import threading

# list of Simulators to check for
known_modules = ['nengo', 'nengo_ocl']

class StartedSimulatorException(Exception):
    pass

class StartedVizException(Exception):
    pass

# create a wrapper class that will throw an exception if we are
# currently executing a script
def make_dummy(cls):
    class DummySimulator(cls):
        def __init__(self, *args, **kwargs):
            if is_executing():
                raise StartedSimulatorException()
            super(DummySimulator, self).__init__(*args, **kwargs)
    return DummySimulator

for name in known_modules:
    try:
        mod = importlib.import_module(name)
        mod.Simulator = make_dummy(mod.Simulator)
    except ImportError:
        pass

# thread local storage for storing whether we are executing a script
flag = threading.local()

def is_executing():
    return getattr(flag, 'executing', False)
