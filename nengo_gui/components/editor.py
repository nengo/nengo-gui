from nengo_gui.components.component import Component


class Editor(Component):
    config_defaults = {}

    def __init__(self):
        # the IPython integration requires this component to be early
        # in the list
        super(Editor, self).__init__(component_order=-8)

    def update_code(self, msg):
        pass

    def javascript(self):
        return "Nengo.disable_editor();"


class NoEditor(Editor):
    def __init__(self):
        super(NoEditor, self).__init__()

    def message(self, msg):
        pass
