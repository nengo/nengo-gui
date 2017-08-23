from nengo_gui.exceptions import NotAttachedError, raise_


class Stream(object):
    """A stream that only sends when output has changed."""

    def __init__(self, name):
        self.name = name
        self._output = None
        self._line = None

    def attach(self, client):
        pass

    def clear(self):
        if self._output is not None or self._line is not None:
            self._output = None
            self._line = None
            self.send()

    def send(self):
        raise NotImplementedError()

    def set(self, output, line=None):
        if output != self._output or line != self._line:
            self._output = output
            self._line = line
            self.send()


class TerminalStream(Stream):
    def attach(self, client):
        client.bind("editor.%s" % (self.name,))(self.set)

    def send(self):
        if self._line is not None:
            print("L%d: %s" % (self._line, self._output))
        elif self._output is not None:
            print(self._output)


class NetworkStream(Stream):
    def __init__(self, name):
        super(NetworkStream, self).__init__(name)
        self.send = lambda: raise_(NotAttachedError())

    def attach(self, client):
        def send():
            client.send("editor.%s" % (self.name,),
                        output=self._output, line=self._line)
        self.send = send

        client.bind("editor.%s" % (self.name,))(self.set)


class Editor(object):
    def __init__(self, stdout, stderr):
        self.stdout = stdout
        self.stderr = stderr

    @property
    def code(self):
        return ""

    def send_filename(self):
        pass

    def update(self, code):
        pass


class NoEditor(Editor):
    def __init__(self):
        super(NoEditor, self).__init__(
            TerminalStream("stdout"), TerminalStream("stderr"))


class AceEditor(Editor):

    def __init__(self):
        super(AceEditor, self).__init__(
            NetworkStream("stdout"), NetworkStream("stderr"))

        self._code = None

        # Defined in `attach`
        self._send_code = lambda: raise_(NotAttachedError())
        self.send_filename = lambda: raise_(NotAttachedError())

    @property
    def code(self):
        return self._code

    def attach(self, client):
        self.stdout.attach(client)
        self.stderr.attach(client)

        def send_code():
            client.send("editor.code", code=self.code)
        self._send_code = send_code

        def send_filename(filename, error=None):
            client.send("editor.filename",
                        filename=filename, error=error)
        self.send_filename = send_filename

        @client.bind("editor.code")
        def _code(code):
            self._code = code

    def update(self, code):
        self._code = code
        self._send_code()
