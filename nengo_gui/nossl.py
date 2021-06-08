class SSLError(Exception):
    pass


def wrap_socket(socket, certfile, keyfile, server_side):
    raise SSLError("Could not import ssl")
