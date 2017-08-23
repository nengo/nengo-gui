import json  # Load to json because dicts have no order

from nengo_gui.editor import AceEditor, NetworkStream, TerminalStream


class TestNetworkStream(object):
    def test_set(self, client):
        stdout = NetworkStream("stdout")
        stdout.attach(client)
        stdout.set("Testing")
        print(client.ws.text)
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": "Testing", "line": None,
        }]

    def test_set_with_line(self, client):
        stdout = NetworkStream("stdout")
        stdout.attach(client)
        stdout.set("Test with line", line=24)
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": "Test with line", "line": 24,
        }]

    def test_set_no_dupes(self, client):
        stdout = NetworkStream("stdout")
        stdout.attach(client)

        stdout.set("Test no dupes", line=1)
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": "Test no dupes", "line": 1,
        }]

        # Clear last output
        client.ws.text = None
        stdout.set("Test no dupes", line=1)
        assert client.ws.text is None  # No new message

        stdout.set("Test no dupes", line=2)
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": "Test no dupes", "line": 2,
        }]

        stdout.set("Test no dupes")
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": "Test no dupes", "line": None,
        }]

        # Clear last output
        client.ws.text = None
        stdout.set("Test no dupes")
        assert client.ws.text is None  # No new message

    def test_dispatch(self, client):
        stdout = NetworkStream("stdout")
        stdout.attach(client)
        client.dispatch("editor.stdout", output="Dispatch test", line=12)
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": "Dispatch test", "line": 12,
        }]

    def test_clear(self, client):
        stdout = NetworkStream("stdout")
        stdout.attach(client)
        stdout.clear()
        assert client.ws.text is None

        stdout.set("Test")
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": "Test", "line": None,
        }]

        stdout.clear()
        assert json.loads(client.ws.text) == ["editor.stdout", {
            "output": None, "line": None,
        }]


class TestTerminalStream(object):
    def test_set(self, capsys):
        stdout = TerminalStream("stdout")
        stdout.set("Testing")
        assert capsys.readouterr() == ("Testing\n", "")

    def test_set_with_line(self, capsys):
        stdout = TerminalStream("stdout")
        stdout.set("Test with line", line=24)
        assert capsys.readouterr() == ("L24: Test with line\n", "")

    def test_set_no_dupes(self, capsys):
        stdout = TerminalStream("stdout")
        stdout.set("Test no dupes", line=1)
        assert capsys.readouterr() == ("L1: Test no dupes\n", "")
        stdout.set("Test no dupes", line=1)
        assert capsys.readouterr() == ("", "")
        stdout.set("Test no dupes", line=2)
        assert capsys.readouterr() == ("L2: Test no dupes\n", "")
        stdout.set("Test no dupes")
        assert capsys.readouterr() == ("Test no dupes\n", "")
        stdout.set("Test no dupes")
        assert capsys.readouterr() == ("", "")

    def test_dispatch(self, client, capsys):
        stdout = TerminalStream("stdout")
        stdout.attach(client)
        client.dispatch("editor.stdout", output="Dispatch test", line=12)
        assert capsys.readouterr() == ("L12: Dispatch test\n", "")

    def test_clear(self, client, capsys):
        stdout = TerminalStream("stdout")
        stdout.clear()
        assert capsys.readouterr() == ("", "")
        stdout.set("Test")
        assert capsys.readouterr() == ("Test\n", "")
        stdout.clear()
        assert capsys.readouterr() == ("", "")


class TestAceEditor(object):
    def test_code_update(self, client):
        editor = AceEditor()
        editor.attach(client)
        assert editor.code is None
        editor.update("Test code")
        assert editor.code == "Test code"
        assert client.ws.text == '["editor.code", {"code": "Test code"}]'

    def test_dispatch(self, client):
        editor = AceEditor()
        editor.attach(client)
        assert editor.code is None
        client.dispatch("editor.code", code="Test code")
        assert editor.code == "Test code"

    def test_send_filename(self, client):
        editor = AceEditor()
        editor.attach(client)
        editor.send_filename("test.py")
        assert json.loads(client.ws.text) == [
            "editor.filename", {"filename": "test.py", "error": None}
        ]
