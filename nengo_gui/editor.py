from nengo_gui.client import bind, ExposedToClient


class Stream(ExposedToClient):
    """A stream that only sends when output has changed."""

    def __init__(self, name, client):
        super(Stream, self).__init__(client)
        self.name = name
        self._output = None
        self._line = None

    def clear(self):
        if self._output is not None or self._line is not None:
            self._output = None
            self._line = None
            self.send()

    def send(self):
        raise NotImplementedError()

    @bind("editor.{self.name}")
    def set(self, output, line=None):
        if output != self._output or line != self._line:
            self._output = output
            self._line = line
            self.send()


class TerminalStream(Stream):
    def send(self):
        if self._line is not None:
            print("L%d: %s" % (self._line, self._output))
        elif self._output is not None:
            print(self._output)


class NetworkStream(Stream):
    def send(self):
        self.client.send("editor.%s" % (self.name,),
                         output=self._output, line=self._line)


class Editor(ExposedToClient):
    def __init__(self, client):
        super(Editor, self).__init__(client)
        self.stdout = None
        self.stderr = None

    @property
    def code(self):
        return ""

    @bind("editor.ready")
    def ready(self):
        pass

    def send_filename(self):
        pass

    def update(self, code):
        pass


class NoEditor(Editor):
    def __init__(self, client):
        super(NoEditor, self).__init__(client)
        self.stdout = TerminalStream("stdout", self.client)
        self.stderr = TerminalStream("stderr", self.client)


class AceEditor(Editor):

    def __init__(self, client):
        super(AceEditor, self).__init__(client)
        self.stdout = NetworkStream("stdout", self.client)
        self.stderr = NetworkStream("stderr", self.client)

        self._code = None

    @property
    @bind("editor.get_code")
    def code(self):
        return self._code

    @code.setter
    @bind("editor.set_code")
    def code(self, code):
        if code != self._code:
            self._code = code

    @bind("editor.sync")
    def sync(self):
        self.client.send("editor.code", code=self.code)

    def send_filename(self, filename, error=None):
        self.client.send("editor.filename",
                         filename=filename, error=error)
