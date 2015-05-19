import nengo_viz.components

def create_action(action, net_graph, **info):
    if action == "expand":
        return ExpandCollapse(net_graph, True, **info)
    elif action == "collapse":
        return ExpandCollapse(net_graph, False, **info)
    elif action == "pan":
        return Pan(net_graph, **info)
    elif action == "zoom":
        return Zoom(net_graph, **info)
    elif action == "create_graph":
        return CreateGraph(net_graph, **info)
    elif action == "pos":
        return Pos(net_graph, **info)
    elif action == "size":
        return Size(net_graph, **info)
    elif action == "pos_size":
        return PosSize(net_graph, **info)
    elif action == "feedforward_layout":
        return FeedforwardLayout(net_graph, **info)
    elif action == "config":
        return ConfigAction(net_graph, **info)
    else:
        return Action(net_graph, **info)

class Action(object):
    def __init__(self, net_graph, **info):
        self.net_graph = net_graph
        self.info = info

    def apply(self):
        raise NotImplemented

    def undo(self):
        raise NotImplemented

class ConfigAction(Action):
    def __init__(self, viz_sim, component, new_cfg, old_cfg):
        self.viz_sim = viz_sim
        self.net_graph = self.viz_sim.net_graph
        self.component = component
        self.new_cfg = new_cfg
        self.old_cfg = old_cfg

    def load(self, cfg):
        for k, v in cfg.items():
            setattr(self.viz_sim.viz.config[self.component.template], k, v)
        self.net_graph.modified_config()
        self.net_graph.to_be_sent.append(dict(type="config", uid=self.component.uid, config=cfg))

    def apply(self):
        self.load(self.new_cfg)

    def undo(self):
        self.load(self.old_cfg)

class ExpandCollapse(Action):
    def __init__(self, net_graph, flag, uid):
        self.net_graph = net_graph
        self.uid = uid
        self.flag = flag

        if flag == True:
            self.net_graph.act_expand(self.uid)
        else:
            self.net_graph.act_collapse(self.uid)
        self.net_graph.modified_config()

    def apply(self):
        if self.flag == True:
            self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))
        else:
            self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))

    def undo(self):
        if self.flag == True:
            self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))
        else:
            self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))

class RemoveGraph(Action):
    def __init__(self, net_graph, component):
        self.uid_graph = component.uid
        self.component = component
        self.net_graph = net_graph

    def apply(self):
        self.net_graph.to_be_sent.append(dict(type='delete_graph', uid=self.uid_graph))

    def undo(self):
        self.net_graph.viz.viz.locals[self.uid_graph] = self.component.template
        self.net_graph.viz.viz.default_labels[self.component.template] = self.uid_graph

        self.net_graph.viz.uids[self.uid_graph] = self.component
        self.net_graph.viz.changed = True
        self.net_graph.to_be_sent.append(dict(type='js', code=self.component.javascript()))

class CreateGraph(Action):
    def __init__(self, net_graph, uid, type, x, y, width, height, **kwargs):
        self.net_graph = net_graph
        self.uid = uid
        self.type=type
        self.x, self.y = x, y
        self.width, self.height = width, height
        self.obj = self.net_graph.uids[self.uid]
        self.uid_graph = None
        cls = getattr(nengo_viz.components, self.type + 'Template')
        self.template = cls(self.obj, **kwargs)

        self.act_create_graph(self.uid_graph)

    def act_create_graph(self, uid_graph):
        if self.uid_graph == None:
            self.net_graph.viz.viz.generate_uid(self.template, prefix='_viz_')
            self.uid_graph = self.net_graph.viz.viz.get_uid(self.template)
        else:
            self.net_graph.viz.viz.locals[uid_graph] = self.template
            self.net_graph.viz.viz.default_labels[self.template] = uid_graph
        self.net_graph.config[self.template].x = self.x
        self.net_graph.config[self.template].y = self.y
        self.net_graph.config[self.template].width = self.width
        self.net_graph.config[self.template].height = self.height
        self.net_graph.modified_config()

        c = self.net_graph.viz.add_template(self.template)
        self.net_graph.viz.changed = True
        self.net_graph.to_be_sent.append(dict(type='js', code=c.javascript()))

    def apply(self):
        self.act_create_graph(self.uid_graph)

    def undo(self):
        self.net_graph.to_be_sent.append(dict(type='delete_graph', uid=self.uid_graph))

class PosSize(Action):
    def __init__(self, net_graph, uid, x, y, width, height):
        self.net_graph = net_graph
        self.uid = uid

        self.obj = self.net_graph.uids[self.uid]
        self.x, self.y = self.net_graph.config[self.obj].pos
        self.width, self.height = self.net_graph.config[self.obj].size

        self.act_pos_size(x, y, width, height)

    def act_pos_size(self, x, y, width, height):
        self.net_graph.config[self.obj].pos = x, y
        self.net_graph.config[self.obj].size = width, height
        self.net_graph.modified_config()

    def apply(self):
        x, y, width, height = self.x, self.y, self.width, self.height
        self.x, self.y = self.net_graph.config[self.obj].pos
        self.width, self.height = self.net_graph.config[self.obj].size
        self.act_pos_size(x, y, width, height)
        self.net_graph.to_be_sent.append(dict(type='pos_size', uid=self.uid, pos=[x,y], size=[width,height]))

    def undo(self):
        self.apply() # Undo is a mirrored operation

class Pos(Action):
    def __init__(self, net_graph, uid, x, y):
        self.net_graph = net_graph
        self.uid = uid
        self.obj = self.net_graph.uids[self.uid]
        self.x, self.y = self.net_graph.config[self.obj].pos

        self.act_pos(x, y)

    def act_pos(self, x, y):
        self.net_graph.config[self.obj].pos = x, y
        self.net_graph.modified_config()

    def apply(self):
        x, y = self.x, self.y
        self.x, self.y = self.net_graph.config[self.obj].pos
        width, height = self.net_graph.config[self.obj].size
        self.act_pos(x, y)
        self.net_graph.to_be_sent.append(dict(type='pos_size', uid=self.uid, pos=[x,y], size=[width,height]))

    def undo(self):
        self.apply() # Undo is a mirrored operation

class Size(Action):
    def __init__(self, net_graph, uid, width, height):
        self.net_graph = net_graph
        self.uid = uid
        self.obj = self.net_graph.uids[self.uid]
        self.width, self.height = self.net_graph.config[self.obj].size

        self.act_size(width, height)

    def act_size(self, width, height):
        self.net_graph.config[self.obj].size = width, height
        self.net_graph.modified_config()

    def apply(self):
        width, height = self.width, self.height
        x, y = self.net_graph.config[self.obj].pos
        self.width, self.height = self.net_graph.config[self.obj].size
        self.act_size(width, height)
        self.net_graph.to_be_sent.append(dict(type='pos_size', uid=self.uid, pos=[x,y], size=[width,height]))

    def undo(self):
        self.apply() # Undo is a mirrored operation

class FeedforwardLayout(Action):
    def __init__(self, net_graph, uid):
        self.net_graph = net_graph
        self.uid = uid
        self.new_state = []
        self.old_state = []

        # record the current positions and sizes of everything in the network
        self.old_state = self.save_network()

        self.act_feedforward_layout()

        self.new_state = self.save_network()

    def act_feedforward_layout(self):
        if self.uid is None:
            network = self.net_graph.viz.model
        else:
            network = self.net_graph.uids[self.uid]
        pos = self.net_graph.layout.make_layout(network)
        for obj, layout in pos.items():
            self.net_graph.config[obj].pos = layout['y'], layout['x']
            self.net_graph.config[obj].size = layout['h'] / 2, layout['w'] / 2

            obj_uid = self.net_graph.viz.viz.get_uid(obj)
            self.net_graph.to_be_sent.append(dict(type='pos_size',
                                        uid=obj_uid,
                                        pos=self.net_graph.config[obj].pos,
                                        size=self.net_graph.config[obj].size))
        self.net_graph.config[network].has_layout = True
        self.net_graph.modified_config()

    def save_network(self):
        if self.uid is None:
            network = self.net_graph.viz.model
        else:
            network = self.net_graph.uids[self.uid]

        # TODO: gross hacky inefficient method, fix it later
        pos = self.net_graph.layout.make_layout(network)
        state = []
        for obj, layout in pos.items():
            item = {'uid':self.net_graph.viz.viz.get_uid(obj),
                    'pos':self.net_graph.config[obj].pos,
                    'size':self.net_graph.config[obj].size,
                    'obj':obj,
                   }
            state.append(item)

        return state

    def load_network(self, state):
        for item in state:
            self.net_graph.to_be_sent.append(dict(type='pos_size',
                                                  uid=item['uid'],
                                                  pos=item['pos'],
                                                  size=item['size'],
                                                 ))
            self.net_graph.config[item['obj']].pos = item['pos']
            self.net_graph.config[item['obj']].size = item['size']
        #TODO: should config[network].has_layout be changed here?
        self.net_graph.modified_config()

    def apply(self):
        self.load_network(self.new_state)

    def undo(self):
        self.load_network(self.old_state)
