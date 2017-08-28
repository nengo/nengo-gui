def raise_(exception):
    raise exception


class NengoGuiError(Exception):
    pass


class NotAttachedError(NengoGuiError):
    pass


class StartedSimulatorException(NengoGuiError):
    pass


class StartedGUIException(NengoGuiError):
    pass
