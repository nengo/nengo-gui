import json

from nengo.utils.progress import ProgressBar, timestamp2timedelta
from nengo_gui.compat import escape
from nengo_gui.components.component import Component


class Progress(Component, ProgressBar):
    def __init__(self):
        super(Progress, self).__init__()
        self.progress = None

    def update(self, progress):
        self.progress = progress

    def update_client(self, client):
        if self.progress is not None:
            client.write_text(
                json.dumps(
                    {
                        "name_during": escape(
                            getattr(self.progress, "name_during", "Building")
                        ),
                        "name_after": escape(
                            getattr(self.progress, "name_after", "Build")
                        ),
                        "progress": self.progress.progress,
                        "max_steps": self.progress.max_steps,
                        "elapsed_time": str(
                            timestamp2timedelta(self.progress.elapsed_seconds())
                        ),
                        "eta": str(timestamp2timedelta(self.progress.eta())),
                        "finished": self.progress.finished,
                        "success": self.progress.success,
                    }
                )
            )
            if self.progress.finished:
                self.progress = None

    def javascript(self):
        info = dict(uid=id(self))
        js = self.javascript_config(info)
        return "progress = new Nengo.Progress({});\n".format(js)
