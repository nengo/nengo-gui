import inspect

import nengo
import nengo_gui.components


def make_param(name, default):
    try:
        # the most recent way of making Parameter objects
        p = nengo.params.Parameter(name=name, default=default)
    except TypeError:
        # this was for older releases of nengo (v2.0.3 and earlier)
        p = nengo.params.Parameter(default=default)
    return p


class Config(nengo.Config):
    def __init__(self):
        super(Config, self).__init__()
        for cls in [nengo.Ensemble, nengo.Node]:
            self.configures(cls)
            self[cls].set_param("pos", make_param(name="pos", default=None))
            self[cls].set_param("size", make_param(name="size", default=None))
        self.configures(nengo.Network)
        self[nengo.Network].set_param("pos", make_param(name="pos", default=None))
        self[nengo.Network].set_param("size", make_param(name="size", default=None))
        self[nengo.Network].set_param(
            "expanded", make_param(name="expanded", default=False)
        )
        self[nengo.Network].set_param(
            "has_layout", make_param(name="has_layout", default=False)
        )

        for clsname, cls in inspect.getmembers(nengo_gui.components):
            if inspect.isclass(cls):
                if issubclass(cls, nengo_gui.components.component.Component):
                    if cls != nengo_gui.components.component.Component:
                        self.configures(cls)
                        for k, v in cls.config_defaults.items():
                            p = make_param(name=k, default=v)
                            self[cls].set_param(k, p)

    def dumps(self, uids):
        lines = []
        for obj, uid in sorted(uids.items(), key=lambda x: x[1]):

            if isinstance(obj, (nengo.Ensemble, nengo.Node, nengo.Network)):
                if self[obj].pos is not None:
                    lines.append("_viz_config[%s].pos=%s" % (uid, self[obj].pos))
                if self[obj].size is not None:
                    lines.append("_viz_config[%s].size=%s" % (uid, self[obj].size))
                if isinstance(obj, nengo.Network):
                    lines.append(
                        "_viz_config[%s].expanded=%s" % (uid, self[obj].expanded)
                    )
                    lines.append(
                        "_viz_config[%s].has_layout=%s" % (uid, self[obj].has_layout)
                    )

            elif isinstance(obj, nengo_gui.components.editor.Editor):
                pass  # Do not persist editor

            elif isinstance(obj, nengo_gui.components.component.Component):
                lines.append("%s = %s" % (uid, obj.code_python(uids)))
                for k in obj.config_defaults.keys():
                    v = getattr(self[obj], k)
                    val = repr(v)

                    try:
                        recovered_v = eval(val, {})
                    except:
                        raise ValueError(
                            "Cannot save %s to config. Only "
                            "values that can be successfully "
                            "evaluated are allowed." % (val)
                        )

                    if recovered_v != v:
                        raise ValueError(
                            "Cannot save %s to config, recovery "
                            "failed. Only "
                            "values that can be recovered after "
                            "being entered into the config file "
                            "can be saved." % (val)
                        )

                    lines.append("_viz_config[%s].%s = %s" % (uid, k, val))

        return "\n".join(lines)
