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
        pass

    def undo(self):
        pass

class ConfigAction(Action):
    def __init__(self, viz_sim, component, new_cfg, old_cfg):
        self.viz_sim = viz_sim
        self.net_graph = self.viz_sim.net_graph
        self.component = component
        self.new_cfg = new_cfg
        self.old_cfg = old_cfg

    def load(self, cfg):
        for k, v in cfg.items():
            # TODO: does this make any sense ???
            setattr(self.viz_sim.viz.config[self.component.template], k, v)
        self.viz_sim.viz.save_config()
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
        
        self.act_expand_collapse(self.flag)
        
    def act_expand_collapse(self, flag):
        net = self.net_graph.uids[self.uid]
        if flag == True:
            self.net_graph.to_be_expanded.append(net)
        self.net_graph.config[net].expanded = flag
        self.net_graph.viz.viz.save_config() 


    def apply(self):
        self.act_expand_collapse(self.flag)
        if self.flag == True:
            self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))
        else: 
            self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))
    
    def undo(self):
        self.act_expand_collapse(not(self.flag))
        if self.flag == True:
            self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))
        else:
            self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))

"""class Collapse(Action):
    def __init__(self, net_graph, uid):
        self.net_graph = net_graph
        self.uid = uid
        
        self.act_collapse()
        
    def act_collapse(self):
        net = self.net_graph.uids[self.uid]
        self.net_graph.config[net].expanded = False
        self.net_graph.viz.viz.save_config()    

    def apply(self):
        self.net_graph.act_collapse(self.uid)
        self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))
    
    def undo(self):
        self.net_graph.act_expand(self.uid)
        self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))"""

"""class Pan(Action):
    def __init__(self, net_graph, x, y):
        self.net_graph = net_graph
        self.x, self.y = self.net_graph.config[self.net_graph.viz.model].pos

    def apply(self):
        x, y = self.x, self.y
        self.x, self.y = self.net_graph.config[self.net_graph.viz.model].pos
        self.net_graph.act_pan(x, y)
        self.net_graph.to_be_sent.append(dict(type='pan',pan=[x, y]))

    def undo(self):
        self.apply() # Undo is a mirrored operation

class Zoom(Action):
    def __init__(self, net_graph, scale, x, y):
        self.net_graph = net_graph
        self.x, self.y = self.net_graph.config[self.net_graph.viz.model].pos
        self.scale = self.net_graph.config[self.net_graph.viz.model].size[0]

    def apply(self):
        scale, x, y = self.scale, self.x, self.y
        self.x, self.y = self.net_graph.config[self.net_graph.viz.model].pos
        self.scale = self.net_graph.config[self.net_graph.viz.model].size[0]
        self.net_graph.act_zoom(scale, x, y)
        self.net_graph.to_be_sent.append(dict(type='zoom',zoom=scale))

    def undo(self):
        self.apply() # Undo is a mirrored operation"""

class RemoveGraph(Action):        
    def __init__(self, net_graph, component, uid, label_visible):
        self.uid_graph = component.uid
        self.x, self.y = component.config.x, component.config.y
        self.width, self.height = component.config.width, component.config.height
        self.label_visible = label_visible
        self.net_graph = net_graph
        
        class_type = type(component).__name__
        cls = getattr(nengo_viz.components, class_type + 'Template')
        
        obj = self.net_graph.uids[uid]
        self.template = cls(obj)
  
    def act_create_graph(self):
        self.net_graph.viz.viz.locals[self.uid_graph] = self.template
        self.net_graph.viz.viz.default_labels[self.template] = self.uid_graph  
        
        self.net_graph.config[self.template].x = self.x
        self.net_graph.config[self.template].y = self.y
        self.net_graph.config[self.template].width = self.width
        self.net_graph.config[self.template].height = self.height
        self.net_graph.config[self.template].label_visible = self.label_visible
        self.net_graph.viz.viz.save_config()

        c = self.net_graph.viz.add_template(self.template)
        self.net_graph.viz.changed = True
        self.net_graph.to_be_sent.append(dict(type='js', code=c.javascript()))    

    def apply(self):
        self.net_graph.to_be_sent.append(dict(type='delete_graph', uid=self.uid_graph))

    def undo(self):
        self.act_create_graph()
        
class CreateGraph(Action):
    def __init__(self, net_graph, uid, type, x, y, width, height):
        self.net_graph = net_graph
        self.uid = uid
        self.type=type
        self.x, self.y = x, y
        self.width, self.height = width, height
        self.obj = self.net_graph.uids[self.uid]
        self.uid_graph = None
        cls = getattr(nengo_viz.components, self.type + 'Template')
        self.template = cls(self.obj)

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
        self.net_graph.viz.viz.save_config()

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
        self.net_graph.viz.viz.save_config()    

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
        self.net_graph.viz.viz.save_config()    

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
        self.net_graph.viz.viz.save_config()    

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
            #self.net_graph.config[network].pos = 0.0, 0.0
            #self.net_graph.config[network].size = 1.0, 1.0
            #self.net_graph.to_be_sent.append(dict(type='pan',
            #                            pan=self.config[network].pos))
            #self.net_graph.to_be_sent.append(dict(type='zoom',
            #                            zoom=self.config[network].size[0]))
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
        self.net_graph.viz.viz.save_config()    

    def save_network(self):
        # TODO: gross hacky inefficient method, fix it later
        if self.uid is None:
            network = self.net_graph.viz.model
        else:
            network = self.net_graph.uids[self.uid]

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
        self.net_graph.viz.viz.save_config()

    def apply(self):
        self.load_network(self.new_state)

    def undo(self):
        self.load_network(self.old_state)

