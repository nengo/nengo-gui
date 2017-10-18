import mimetypes
import pkgutil
try:
    from html import escape
except ImportError:
    from cgi import escape

from nengo_gui import server


class Asset(object):
    def __init__(self, tag, inner=None, **attrs):
        self.tag = tag
        self.inner = inner
        self.attrs = attrs

    def __str__(self):
        attrs_strings = [
            '{name}="{value}"'.format(name=k, value=escape(v, quote=True))
            for k, v in self.attrs.items() if v is not None]
        if self.inner is None:
            return '<{tag} {attrs} />'.format(
                tag=self.tag, attrs=' '.join(attrs_strings))
        else:
            return '<{tag} {attrs}>{inner}</{tag}>'.format(
                tag=self.tag, attrs=' '.join(attrs_strings), inner=self.inner)


class ScriptAsset(Asset):
    def __init__(self, src=None, inner='', type='text/javascript', **attrs):
        if src is None and inner is '':
            raise ValueError("Either src or inner has to be set.")
        elif src is not None and inner is not '':
            raise ValueError("Only one of src and inner may be set.")

        super(ScriptAsset, self).__init__(
            'script', src=src, inner=inner, type=type, **attrs)


class LinkAsset(Asset):
    def __init__(self, href, rel='stylesheet', type='text/css', **attrs):
        super(LinkAsset, self).__init__(
            'link', href=href, rel=rel, type=type, **attrs)


class Plugin(object):
    def __init__(self, name, module_name):
        self.name = name
        self.module_name = module_name

    def serve(self, resource):
        if resource.startswith('/static/'):
            return self.serve_static(resource)
        else:
            raise server.InvalidResource(resource)

    def serve_static(self, resource):
        mimetype, _ = mimetypes.guess_type(resource)
        data = pkgutil.get_data(self.module_name, resource)
        return server.HttpResponse(data, mimetype)

    def get_assets(self):
        return []
