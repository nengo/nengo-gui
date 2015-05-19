def create_action(action, net_graph, **info):
    print( action )
    if action == "expand":
        return Expand(net_graph, **info)
    elif action == "collapse":
        return Collapse(net_graph, **info)
    elif action == "pan":
        return Pan(net_graph, **info)
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
    
    def undo(self):
        self.net_graph.act_collapse(self.uid)

class Collapse(Action):
    def __init__(self, net_graph, uid):
        self.net_graph = net_graph
        self.uid = uid

    def apply(self):
        self.net_graph.act_collapse(self.uid)
    
    def undo(self):
        self.net_graph.act_expand(self.uid)

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

    def undo(self):
        #print("inside undo")
        #print( self.old_x, self.old_y)
        #print( self.new_x, self.new_y)
        self.new_x, self.new_y = self.net_graph.config[self.net_graph.viz.model].pos
        self.net_graph.act_pan(self.old_x, self.old_y)

class Pos(Action):
    def __init__(self, net_graph, uid, x, y, width, height):
        self.net_graph = net_graph
        self.new_x = x
        self.new_y = y
        self.old_x = 0
        self.old_y = 0

