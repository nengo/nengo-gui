import contextlib
import importlib
import threading
import traceback
import sys


# list of Simulators to check for
known_modules = ['nengo', 'nengo_ocl', 'nengo_distilled',
                 'nengo_brainstorm', 'nengo_spinnaker']
found_modules = []


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


# thread local storage for storing whether we are executing a script
flag = threading.local()


def is_executing():
    return getattr(flag, 'executing', False)


def determine_line_number(filename='<string>'):
    '''Checks stack trace to determine the line number we are currently at.

    The default filname argument of "<string>" indicates it should only
    pay attention to the line numbers in the main evaluated script (which
    is evaluated using exec(), so it doesn't have a normal filename).
    '''
    if hasattr(sys, 'exc_traceback'):
        tb = traceback.extract_tb(sys.exc_traceback)
        for fn, line, function, code in reversed(tb):
            if fn == filename:
                return line

    # if we can't find it that way, parse the text of the stack trace
    #  note that this is required for indentation errors and other syntax
    #  problems
    trace = traceback.format_exc()
    pattern = 'File "%s", line ' % filename
    index = trace.find(pattern)
    if index >=0:
        text = trace[index + len(pattern):].split('\n', 1)[0]
        if ',' in text:
            text = text.split(',', 1)[0]
        line = int(text)
        return line
    return None


@contextlib.contextmanager
def patch():
    flag.executing = True
    del found_modules[:]
    simulators = {}
    for name in known_modules:
        try:
            mod = importlib.import_module(name)
        except:
            continue
        found_modules.append(name)
        simulators[mod] = mod.Simulator
        mod.Simulator = make_dummy(mod.Simulator)
    yield
    for mod, cls in simulators.items():
        mod.Simulator = cls
    flag.executing = False
