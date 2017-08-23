def raise_(exception):
    raise exception


class NengoGuiError(Exception):
    pass


class NotAttachedError(NengoGuiError):
    pass
