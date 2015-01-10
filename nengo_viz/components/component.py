class Component(object):
    def __init__(self, viz, x=None, y=None, width=100, height=100):
        viz.add(self)
        if x is None:
            x = len(viz.components) * 20
        if y is None:
            y = len(viz.components) * 10
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    def update_client(self, client):
        pass
    def message(self, msg):
        print 'unhandled message', msg
