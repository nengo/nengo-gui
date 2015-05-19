def create_action(action, net_graph, **info):
    print( action )
    if action == "expand":
        return Expand(net_graph, **info)
    elif action == "collapse":
        return Collapse(net_graph, **info)
    elif action == "pan":
        return Pan(net_graph, **info)
    elif action == "create_graph":  
        return CreateGraph(net_graph, **info)
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
        #self.net_graph.act_expand(self.uid)
        self.net_graph.to_be_sent.append(dict(type='expand',uid=self.uid))
    
    def undo(self):
        #self.net_graph.act_collapse(self.uid)
        self.net_graph.to_be_sent.append(dict(type='collapse',uid=self.uid))

class Collapse(Action):
    def __init__(self, net_graph, uid):
        self.net_graph = net_graph
        self.uid = uid

    def apply(self):
        #self.net_graph.act_collapse(self.uid)
        self.net_graph.to_be_sent.append(dict(type='collapse',uid=uid))
    
    def undo(self):
        #self.net_graph.act_expand(self.uid)
        self.net_graph.to_be_sent.append(dict(type='expand',uid=uid))

class Pan(Action):
    def __init__(self, net_graph, x, y):
        self.net_graph = net_graph
        self.new_x = x
        self.new_y = y
        self.old_x = 0
        self.old_y = 0

    def apply(self):
        self.old_x, self.old_y = self.net_graph.config[self.net_graph.viz.model].pos
        self.net_graph.act_pan(self.new_x, self.new_y)
        self.net_graph.to_be_sent.append(dict(type='pan',pan=[self.new_x,self.new_y]))

    def undo(self):
        self.new_x, self.new_y = self.net_graph.config[self.net_graph.viz.model].pos
        self.net_graph.act_pan(self.old_x, self.old_y)
        self.net_graph.to_be_sent.append(dict(type='pan',pan=[self.old_x,self.old_y]))

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
    
     
        
