from nengo.utils.compat import iteritems

import nengo_gui.components


def create_action(action, net_graph, **kwargs):
    if action == "expand":
        return ExpandCollapse(net_graph, expand=True, **kwargs)
    elif action == "collapse":
        return ExpandCollapse(net_graph, expand=False, **kwargs)
    elif action == "create_graph":
        return CreateGraph(net_graph, **kwargs)
    elif action == "pos":
        return Pos(net_graph, **kwargs)
    elif action == "size":
        return Size(net_graph, **kwargs)
    elif action == "pos_size":
        return PosSize(net_graph, **kwargs)
    elif action == "feedforward_layout":
        return FeedforwardLayout(net_graph, **kwargs)
    elif action == "config":
        return ConfigAction(net_graph, **kwargs)
    else:
        return Action(net_graph, **kwargs)


class Action(object):
    def __init__(self, net_graph, uid):
        self.net_graph = net_graph
        self.uid = uid

    @property
    def obj(self):
        if self.uid is None:
            raise ValueError("Cannot get 'obj' without 'uid'")
        return self.net_graph.uids[self.uid]

    @property
    def obj_config(self):
        if self.uid is None:
            raise ValueError("Cannot get 'obj' without 'uid'")
        return self.net_graph.page.config[self.obj]

    def send(self, action, **kwargs):
        if "uid" not in kwargs:
            kwargs["uid"] = self.uid
        kwargs["type"] = action
        self.net_graph.to_be_sent.append(kwargs)

    def apply(self):
        raise NotImplementedError('Subclasses should implement this.')

    def undo(self):
        raise NotImplementedError('Subclasses should implement this.')


class ConfigAction(Action):
    def __init__(self, page, component, new_cfg, old_cfg):
        super(ConfigAction, self).__init__(page.net_graph, id(component))
        self.component = component
        self.page = page
        self.new_cfg = new_cfg
        self.old_cfg = old_cfg

    def load(self, cfg):
        for k, v in iteritems(cfg):
            setattr(self.page.config[self.component], k, v)
        self.net_graph.modified_config()
        self.send("config", config=cfg)

    def apply(self):
        self.load(self.new_cfg)

    def undo(self):
        self.load(self.old_cfg)


class ExpandCollapse(Action):
    def __init__(self, net_graph, uid, expand):
        super(ExpandCollapse, self).__init__(net_graph, uid)
        self.expand = expand
        if expand:
            self.net_graph.act_expand(self.uid)
        else:
            self.net_graph.act_collapse(self.uid)

    def apply(self):
        if self.expand:
            self.send('expand')
        else:
            self.send('collapse')

    def undo(self):
        if self.expand:
            self.send('collapse')
        else:
            self.send('expand')


class RemoveGraph(Action):
    def __init__(self, net_graph, component):
        super(RemoveGraph, self).__init__(net_graph, id(component))
        self.component = component

    def apply(self):
        self.send('delete_graph')

    def undo(self):
        page = self.net_graph.page
        page.add_component(self.component)

        page.locals[self.component.uid] = self.component
        page.default_labels[self.component] = self.component.uid

        page.changed = True
        self.send('js', code=self.component.javascript())


class CreateGraph(Action):
    def __init__(self, net_graph, uid, type, x, y, width, height, **kwargs):
        super(CreateGraph, self).__init__(net_graph, uid)
        self.graph_uid = None
        self.type = type
        self.x, self.y = x, y
        self.width, self.height = width, height
        cls = getattr(nengo_gui.components, self.type)
        self.component = cls(self.obj, **kwargs)

        # If only one instance of the component is allowed, and another had to be
        # destroyed to create this one, keep track of it here so it can be undone
        self.duplicate = None

        # Remove any existing sliders associated with the same node
        if type == 'Slider':
            for component in self.net_graph.page.components:
                if (isinstance(component, nengo_gui.components.slider.Slider)
                        and component.node is self.obj):
                    self.duplicate = RemoveGraph(net_graph, component)
                    self.send('delete_graph', uid=component.original_id)

        self.act_create_graph()

    def act_create_graph(self):
        if self.graph_uid is None:
            self.net_graph.page.generate_uid(self.component, prefix='_viz_')
            self.graph_uid = self.net_graph.page.get_uid(self.component)
        else:
            self.net_graph.page.locals[self.graph_uid] = self.component
            self.net_graph.page.default_labels[self.component] = (
                self.graph_uid)
        self.net_graph.page.config[self.component].x = self.x
        self.net_graph.page.config[self.component].y = self.y
        self.net_graph.page.config[self.component].width = self.width
        self.net_graph.page.config[self.component].height = self.height
        self.net_graph.modified_config()

        self.net_graph.page.add_component(self.component)
        self.net_graph.page.changed = True
        self.send('js', code=self.component.javascript())

    def apply(self):
        if self.duplicate is not None:
            self.duplicate.apply()
        self.act_create_graph()

    def undo(self):
        self.send('delete_graph', uid=self.component.original_id)
        if self.duplicate is not None:
            self.duplicate.undo()


class PosSize(Action):
    def __init__(self, net_graph, uid, x, y, width, height):
        super(PosSize, self).__init__(net_graph, uid)
        self.x, self.y = self.obj_config.pos
        self.width, self.height = self.obj_config.size

        self.act_pos_size(x, y, width, height)

    def act_pos_size(self, x, y, width, height):
        self.obj_config.pos = x, y
        self.obj_config.size = width, height
        self.net_graph.modified_config()

    def apply(self):
        x, y, width, height = self.x, self.y, self.width, self.height
        self.x, self.y = self.obj_config.pos
        self.width, self.height = self.obj_config.size
        self.act_pos_size(x, y, width, height)
        self.send('pos_size', pos=[x, y], size=[width, height])

    def undo(self):
        self.apply()  # PosSize is a mirrored operation


class Pos(Action):
    def __init__(self, net_graph, uid, x, y):
        super(Pos, self).__init__(net_graph, uid)
        self.x, self.y = self.obj_config.pos

        self.act_pos(x, y)

    def act_pos(self, x, y):
        self.obj_config.pos = x, y
        self.net_graph.modified_config()

    def apply(self):
        x, y = self.x, self.y
        self.x, self.y = self.obj_config.pos
        width, height = self.obj_config.size
        self.act_pos(x, y)
        self.send('pos_size', pos=[x, y], size=[width, height])

    def undo(self):
        self.apply()  # Pos is a mirrored operation


class Size(Action):
    def __init__(self, net_graph, uid, width, height):
        super(Size, self).__init__(net_graph, uid)
        self.width, self.height = self.obj_config.size

        self.act_size(width, height)

    def act_size(self, width, height):
        self.obj_config.size = width, height
        self.net_graph.modified_config()

    def apply(self):
        width, height = self.width, self.height
        x, y = self.obj_config.pos
        self.width, self.height = self.obj_config.size
        self.act_size(width, height)
        self.send('pos_size', pos=[x, y], size=[width, height])

    def undo(self):
        self.apply()  # Size is a mirrored operation


class FeedforwardLayout(Action):
    def __init__(self, net_graph, uid):
        super(FeedforwardLayout, self).__init__(net_graph, uid)

        if self.uid is None:
            self.network = self.net_graph.page.model
            self.scale = self.net_graph.page.config[self.network].size[0]
            self.x, self.y = self.net_graph.page.config[self.network].pos
        else:
            self.network = self.obj
            self.scale = 1.0
            self.x, self.y = 0, 0

        self.pos = self.net_graph.layout.make_layout(self.network)
        # record the current positions and sizes of everything in the network
        self.old_state = self.save_network()
        self.act_feedforward_layout()
        self.new_state = self.save_network()

    def act_feedforward_layout(self):
        for obj, layout in iteritems(self.pos):
            obj_cfg = self.net_graph.page.config[obj]
            obj_cfg.pos = (layout['y'] / self.scale - self.x,
                           layout['x'] / self.scale - self.y)
            obj_cfg.size = (layout['h'] / 2 / self.scale,
                            layout['w'] / 2 / self.scale)

            obj_uid = self.net_graph.page.get_uid(obj)

            self.send('pos_size',
                      uid=obj_uid, pos=obj_cfg.pos, size=obj_cfg.size)

        self.net_graph.page.config[self.network].has_layout = True
        self.net_graph.modified_config()

    def save_network(self):
        state = []
        for obj, layout in iteritems(self.pos):
            state.append({
                'uid': self.net_graph.page.get_uid(obj),
                'pos': self.net_graph.page.config[obj].pos,
                'size': self.net_graph.page.config[obj].size,
                'obj': obj,
            })
        return state

    def load_network(self, state):
        for item in state:
            self.send('pos_size',
                      uid=item['uid'], pos=item['pos'], size=item['size'])
            self.net_graph.page.config[item['obj']].pos = item['pos']
            self.net_graph.page.config[item['obj']].size = item['size']
        # TODO: should config[network].has_layout be changed here?
        self.net_graph.modified_config()

    def apply(self):
        self.load_network(self.new_state)

    def undo(self):
        self.load_network(self.old_state)
