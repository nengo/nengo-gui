import random
import time

import swi

class Server(swi.SimpleWebInterface):
    serve_dirs = ['static']

    def swi(self):
        html = open('templates/page.html').read()
        components = self.viz.create_javascript()
        return html % dict(components=components)

    def ws_viz_component(self, client, id):
        component = self.viz.get_component(int(id))

        while True:
            msg = client.read()
            while msg is not None:
                component.message(msg)
                msg = client.read()

            component.update_client(client)
            time.sleep(0.01)


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

class Slider(Component):
    def __init__(self, viz, node, **kwargs):
        super(Slider, self).__init__(viz, **kwargs)
        self.node = node
        self.base_output = node.output
        node.output = self.override_output
        self.override = [None] * node.size_out
        self.value = np.zeros(node.size_out)

    def override_output(self, t, *args):
        if callable(self.base_output):
            self.value[:] = self.base_output(t, *args)
        else:
            self.value[:] = self.base_output

        for i, v in enumerate(self.override):
            if v is not None:
                self.value[i] = v
        return self.value

    def javascript(self):
        return ('new VIZ.Slider({parent:main, n_sliders:%(n_sliders)d, '
                'x:%(x)g, y:%(x)g, '
                'width:%(width)g, height:%(height)g, id:%(id)d});' %
                dict(x=self.x, y=self.y, width=self.width, height=self.height,
                 n_sliders=len(self.override), id=id(self)))

    def message(self, msg):
        index, value = msg.split(',')
        index = int(index)
        value = float(value)
        self.override[index] = value


class Value(Component):
    def __init__(self, viz, obj, **kwargs):
        super(Value, self).__init__(viz, **kwargs)
        self.obj = obj
        self.data = []
        self.n_lines = obj.size_out
        with viz.model:
            self.node = nengo.Node(self.gather_data, size_in=obj.size_out)
            self.conn = nengo.Connection(obj, self.node, synapse=0.01)

    def gather_data(self, t, x):
        self.data.append(np.array(x))

    def update_client(self, client):
        while len(self.data) > 0:
            data = self.data.pop(0)
            data = ['%g' % d for d in data]
            client.write(','.join(data))

    def javascript(self):
        return ('new VIZ.LineGraph({parent:main, x:%(x)g, y:%(x)g, '
                'width:%(width)g, height:%(height)g, id:%(id)d, '
                'n_lines:%(n_lines)d});' %
                dict(x=self.x, y=self.y, width=self.width, height=self.height,
                     id=id(self), n_lines=self.n_lines))

class Viz(object):
    def __init__(self, model):
        self.model = model
        self.components = {}

    def add(self, component):
        self.components[id(component)] = component

    def get_component(self, id):
        return self.components[id]

    def slider(self, *args, **kwargs):
        return Slider(self, *args, **kwargs)

    def value(self, *args, **kwargs):
        return Value(self, *args, **kwargs)

    def start(self, port=8080, browser=True):
        self.sim = nengo.Simulator(self.model)
        Server.viz = viz
        import thread
        thread.start_new_thread(self.runner, ())
        Server.start(port=port, browser=browser)

    def runner(self):
        import time
        while True:
            self.sim.run(10, progress_bar=False)

    def create_javascript(self):
        return '\n'.join([c.javascript() for c in self.components.values()])


import nengo

def viz(model):
    Server.sim = nengo.Simulator(model)
    Server.start(port=8080, browser=True)

if __name__ == '__main__':
    import numpy as np
    model = nengo.Network()
    with model:
        stimulus_A = nengo.Node([1])
        stimulus_B = nengo.Node(lambda t: np.sin(2*np.pi*t))
        ens = nengo.Ensemble(n_neurons=100, dimensions=2)
        result = nengo.Ensemble(n_neurons=50, dimensions=1)
        nengo.Connection(stimulus_A, ens[0])
        nengo.Connection(stimulus_B, ens[1])
        nengo.Connection(ens, result, function=lambda x: x[0] * x[1],
                         synapse=0.01)

        import time
        class Timer(object):
            def __init__(self):
                self.ticks = 0
                self.start_time = time.time()
            def __call__(self, t):
                self.ticks += 1
                if self.ticks % 1000 == 0:
                    now = time.time()
                    dt = now - self.start_time
                    print 'rate: %g' % (1.0 / dt)
                    self.start_time = now
        nengo.Node(Timer())

    #sim = nengo.Simulator(model)
    #sim.run(100, progress_bar=False)


    viz = Viz(model)
    viz.slider(stimulus_A)
    viz.slider(stimulus_B)
    viz.value(ens)
    viz.value(result)
    viz.start()




