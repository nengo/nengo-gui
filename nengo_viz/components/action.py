def create_action(action, net_graph, **info):
    if action == "expand":
        return Expand(net_graph, **info)
    elif action == "collapse":
        return Collapse(net_graph, **info)
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

class Expand(Action):
    def __init__(self, net_graph, uid):
        self.net_graph = net_graph
        self.uid = uid

    def apply(self):
        self.net_graph.act_expand(self.uid)
        self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))
    
    def undo(self):
        self.net_graph.act_collapse(self.uid)
        self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))

class Collapse(Action):
    def __init__(self, net_graph, uid):
        self.net_graph = net_graph
        self.uid = uid

    def apply(self):
        self.net_graph.act_collapse(self.uid)
        self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))
    
    def undo(self):
        self.net_graph.act_expand(self.uid)
        self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))

class Pan(Action):
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
        self.apply() # Undo is a mirrored operation

class CreateGraph(Action):
    def __init__(self, net_graph, uid, type, x, y, width, height):
        self.net_graph = net_graph
        self.uid = uid
        self.type=type
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        
    def apply(self):
        #self.x = self.config[template].x
        #self.y = self.config[template].y
        #self.width = self.config[template].width
        #self.height = self.config[template].height
              
        self.net_graph.act_create_graph(self.uid, self.type, self.x, self.y, self.width, self.height)

    def undo(self):
        self.net_graph.to_be_sent.append(dict(type='delete_graph', uid=self.uid))
    

class PosSize(Action):
    def __init__(self, net_graph, uid, x, y, width, height):
        self.net_graph = net_graph
        self.uid = uid
        
        obj = self.net_graph.uids[self.uid]
        self.x, self.y = self.net_graph.config[obj].pos
        self.width, self.height = self.net_graph.config[obj].size

    def apply(self):
        x, y, width, height = self.x, self.y, self.width, self.height
        obj = self.net_graph.uids[self.uid]
        self.x, self.y = self.net_graph.config[obj].pos
        self.width, self.height = self.net_graph.config[obj].size
        self.net_graph.act_pos_size(self.uid, x, y, width, height)
        self.net_graph.to_be_sent.append(dict(type='pos_size', uid=self.uid, pos=[x,y], size=[width,height]))

    def undo(self):
        self.apply() # Undo is a mirrored operation

class Pos(Action):
    def __init__(self, net_graph, uid, x, y):
        self.net_graph = net_graph
        self.uid = uid
        obj = self.net_graph.uids[self.uid]
        self.x, self.y = self.net_graph.config[obj].pos

    def apply(self):
        x, y = self.x, self.y
        obj = self.net_graph.uids[self.uid]
        self.x, self.y = self.net_graph.config[obj].pos
        width, height = self.net_graph.config[obj].size
        self.net_graph.act_pos(self.uid, x, y)
        self.net_graph.to_be_sent.append(dict(type='pos_size', uid=self.uid, pos=[x,y], size=[width,height]))

    def undo(self):
        self.apply() # Undo is a mirrored operation

class Size(Action):
    def __init__(self, net_graph, uid, width, height):
        self.net_graph = net_graph
        self.uid = uid
        obj = self.net_graph.uids[self.uid]
        self.width, self.height = self.net_graph.config[obj].size

    def apply(self):
        width, height = self.width, self.height
        obj = self.net_graph.uids[self.uid]
        x, y = self.net_graph.config[obj].pos
        self.width, self.height = self.net_graph.config[obj].size
        self.net_graph.act_size(self.uid, width, height)
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
        #TODO: should config[network].has_layout be changed here?

    def apply(self):
        self.load_network(self.new_state)

    def undo(self):
        # Save the layout configuration for the redo command
        # Only save if it has not already been saved
        if not self.new_state:
            self.new_state = self.save_network()
        self.load_network(self.old_state)

