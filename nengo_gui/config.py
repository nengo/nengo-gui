import json
import re
import warnings

import nengo
from nengo.utils.compat import iteritems

from nengo_gui.components import Position


class NengoGUIConfig(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, "to_json"):
            return obj.to_json()
        return super(NengoGUIConfig, self).default(obj)


def upgrade(old_text, locals):
    """Upgrades a .cfg file from the old format (GUI 0.2)."""

    new_config = {}

    # All lines in the old files were assignments, so we won't
    # use a full-fledged Python parser for this
    cfgline = re.compile(r"(?P<cfg>\S+?)\[(?P<obj>\S+)\]\.(?P<kw>\S+)")
    compline = re.compile(
        r"nengo_gui\.components\.(?P<cls>\S+)\((?P<arg>\S+)\)")

    for line in old_text.splitlines():
        left, right = line.split("=", 1)
        left, right = left.strip(), right.strip()

        # AceEditor, NetGraph and SimControl are no longer in cfg file
        removed = ["AceEditor", "NetGraph", "SimControl"]
        if any(r in right for r in removed) or "sim_control" in left:
            continue

        # Setting a value on a config item
        elif "]." in left:
            # Use a regex to parse left
            match = cfgline.match(left)
            if match is None:
                raise ValueError("Could not parse %r" % left)

            # TODO: some sanity checking on cfg group
            obj = match.group("obj")
            kw = match.group("kw")
            if obj not in new_config:
                # Could be a Nengo object with position / size.
                # Try to figure out what type of object and add it.
                try:
                    o = eval(obj, locals)
                    if isinstance(o, nengo.Network):
                        cls = "Network"
                    else:
                        cls = type(o).__name__
                    new_config[obj] = {"cls": cls}
                except Exception as e:
                    warnings.warn("Skipping %r: %s" % (obj, e))
            if obj in new_config:
                new_config[obj][kw] = eval(right)

        # Making a new component
        else:
            assert "nengo_gui.components" in right
            obj = left
            match = compline.match(right)
            if match is None:
                raise ValueError("Could not parse %r" % right)
            args = match.group("arg").split(",")
            new_config[obj] = {
                "cls": match.group("cls").replace("Template", ""),
                "obj": args[0],
            }
            for arg in args[1:]:
                key, val = arg.split("=")
                new_config[obj][key] = eval(val)

            # Some components have been renamed
            if new_config[obj]["cls"] == "Pointer":
                new_config[obj]["cls"] = "SpaPointer"

    # Additional changes
    for obj, kwargs in iteritems(new_config):
        # pos and size now one object
        if "size" in kwargs:
            pos = kwargs.pop("pos")
            size = kwargs.pop("size")
            kwargs["pos"] = Position(
                x=pos[0], y=pos[1], width=size[0], height=size[1])

        # x, y, width, height now one object
        if "width" in kwargs:
            kwargs["pos"] = Position(x=kwargs.pop("x"),
                                     y=kwargs.pop("y"),
                                     width=kwargs.pop("width"),
                                     height=kwargs.pop("height"))

        # label_visible now label is not None
        if "label_visible" in kwargs:
            visible = kwargs.pop("label_visible")
            kwargs["label"] = obj if visible else None

        # show_legend now legend
        if "show_legend" in kwargs:
            kwargs["legend"] = kwargs.pop("show_legend")

        # max_value, min_value now ylim
        if "max_value" in kwargs:
            maxval = kwargs.pop("max_value")
            minval = kwargs.pop("min_value")
            kwargs["ylim"] = (minval, maxval)

    return json.dumps(new_config, cls=NengoGUIConfig, indent=2, sort_keys=True)
