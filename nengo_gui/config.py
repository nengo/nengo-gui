import inspect

import nengo

from nengo_gui import components


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
        for cls in [nengo.Ensemble, nengo.Node, nengo.Network]:
            self.configures(cls)
            self[cls].set_param('pos', make_param(name='pos', default=None))
            self[cls].set_param('size', make_param(name='size', default=None))
        self[nengo.Network].set_param(
            'expanded', make_param(name='expanded', default=False))
        self[nengo.Network].set_param(
            'has_layout', make_param(name='has_layout', default=False))

        # TODO: register components with config instead of doing it here
        for clsname, cls in inspect.getmembers(components):
            if (inspect.isclass(cls)
                    and issubclass(cls, components.Component)
                    and cls != components.Component):
                self.configures(cls)
                for k, v in cls.config_defaults.items():
                    p = make_param(name=k, default=v)
                    self[cls].set_param(k, p)

    def dumps(self, uids):
        lines = []
        for obj, uid in sorted(uids.items(), key=lambda x: x[1]):

            if isinstance(obj, (nengo.Ensemble, nengo.Node, nengo.Network)):
                if self[obj].pos is not None:
                    lines.append('_gui_config[%s].pos=%s' % (uid,
                                                             self[obj].pos))
                if self[obj].size is not None:
                    lines.append('_gui_config[%s].size=%s' % (uid,
                                                              self[obj].size))
                if isinstance(obj, nengo.Network):
                    lines.append('_gui_config[%s].expanded=%s'
                                 % (uid, self[obj].expanded))
                    lines.append('_gui_config[%s].has_layout=%s'
                                 % (uid, self[obj].has_layout))

            elif isinstance(obj, components.Component):
                lines.append('%s = %s' % (uid, obj.code_python(uids)))
                for k in obj.config_defaults.keys():
                    v = getattr(self[obj], k)
                    val = repr(v)

                    try:
                        recovered_v = eval(val, {})
                    except:
                        raise ValueError("Cannot save %s to config. Only "
                                         "values that can be successfully "
                                         "evaluated are allowed." % (val))

                    if recovered_v != v:
                        raise ValueError("Cannot save %s to config, recovery "
                                         "failed. Only "
                                         "values that can be recovered after "
                                         "being entered into the config file "
                                         "can be saved." % (val))

                    lines.append('_gui_config[%s].%s = %s' % (uid, k, val))

        return '\n'.join(lines)


class ServerSettings(object):
    __slots__ = ('listen_addr',
                 'auto_shutdown',
                 'password_hash',
                 'ssl_cert',
                 'ssl_key',
                 'session_duration')

    def __init__(self,
                 listen_addr=('localhost', 8080),
                 auto_shutdown=2,
                 password_hash=None,
                 ssl_cert=None,
                 ssl_key=None,
                 session_duration=60 * 60 * 24 * 30):
        self.listen_addr = listen_addr
        self.auto_shutdown = auto_shutdown
        self.password_hash = password_hash
        self.ssl_cert = ssl_cert
        self.ssl_key = ssl_key
        self.session_duration = session_duration

    @property
    def use_ssl(self):
        if self.ssl_cert is None and self.ssl_key is None:
            return False
        elif self.ssl_cert is not None and self.ssl_key is not None:
            return True
        else:
            raise ValueError("SSL needs certificate file and key file.")
