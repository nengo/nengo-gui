import nengo
from grandalf.graphs import Vertex, Edge, Graph
from grandalf.layouts import VertexViewer, SugiyamaLayout

class Layout(object):
    def __init__(self, model):
        self.model = model
        self.parents = {}
        self.unexamined_networks = [model]

    def find_parent(self, obj):
        if obj is self.model:
            return None
        parent = self.parents.get(obj, None)
        while parent is None:
            net = self.unexamined_networks.pop(0)
            for n in net.nodes:
                self.parents[n] = net
            for e in net.ensembles:
                self.parents[e] = net
            for n in net.networks:
                self.parents[n] = net
                self.unexamined_networks.append(n)
            parent = self.parents.get(obj, None)
        return parent

    def compute_bounds(self, graph):
        minx = None
        maxx = None
        miny = None
        maxy = None

        for v in graph.V():
            x0 = v.view.xy[0] - v.view.w / 2.0
            x1 = v.view.xy[0] + v.view.w / 2.0
            y0 = v.view.xy[1] - v.view.h / 2.0
            y1 = v.view.xy[1] + v.view.h / 2.0
            if minx is None or x0 < minx:
                minx = x0
            if maxx is None or x1 > maxx:
                maxx = x1
            if miny is None or y0 < miny:
                miny = y0
            if maxy is None or y1 > maxy:
                maxy = y1
        return minx, miny, maxx, maxy



    def make_layout(self, network):
        vertices = {}
        for n in network.nodes:
            vertices[n] = Vertex(n)
            vertices[n].view = VertexViewer(w=10, h=20)
        for e in network.ensembles:
            vertices[e] = Vertex(e)
            vertices[e].view = VertexViewer(w=10, h=20)
        for n in network.networks:
            vertices[n] = Vertex(n)
            vertices[n].view = VertexViewer(w=40, h=40)

        edges = {}
        for c in network.connections:
            pre = c.pre_obj
            while pre not in vertices:
                pre = self.find_parent(pre)
            post = c.post_obj
            while post not in vertices:
                post = self.find_parent(post)

            edges[c] = Edge(vertices[pre], vertices[post], data=c)

        graph = Graph(vertices.values(), edges.values())

        layouts = [SugiyamaLayout(g) for g in graph.C]
        for layout in layouts:
            layout.init_all()
            layout.draw(3)

        bounds = [self.compute_bounds(g) for g in graph.C]

        widths = [b[2] - b[0] for b in bounds]
        heights = [b[3] - b[1] for b in bounds]

        spacing = 5

        total_width = sum(widths) + spacing * (len(widths) + 1)

        scale_x = 1.0 / total_width

        x0 = spacing * scale_x

        pos = {}

        for i, core in enumerate(graph.C):
            scale_y = 1.0 / (heights[i] + spacing * 2)
            x1 = x0 + widths[i] * scale_x
            y0 = spacing * scale_y
            y1 = 1.0 - y0

            minx, miny, maxx, maxy = bounds[i]

            for v in core.V():
                x = x0 + (v.view.xy[0] - minx) * (x1 - x0) / (maxx - minx)
                y = y0 + (v.view.xy[1] - miny) * (y1 - y0) / (maxy - miny)
                w = v.view.w * (x1 - x0) / (maxx - minx)
                h = v.view.h * (y1 - y0) / (maxy - miny)
                pos[v.data] = dict(x=x, y=y, w=w, h=h)

        return pos


if __name__ == '__main__':
    import numpy as np
    model = nengo.Network()
    with model:
        stimulus_A = nengo.Node([1], label='stim A')
        stimulus_B = nengo.Node(lambda t: np.sin(2*np.pi*t))
        ens = nengo.Ensemble(n_neurons=1000, dimensions=2)
        result = nengo.Ensemble(n_neurons=50, dimensions=1)
        nengo.Connection(stimulus_A, ens[0])
        nengo.Connection(stimulus_B, ens[1])
        nengo.Connection(ens, result, function=lambda x: x[0] * x[1],
                         synapse=0.01)

        with nengo.Network(label='subnet') as subnet:
            a = nengo.Ensemble(100, 1)
            b = nengo.Ensemble(100, 1)
            nengo.Connection(a, b)
            nengo.Connection(b, b)

            with nengo.Network() as subsubnet:
                c = nengo.Ensemble(100, 1)
                d = nengo.Ensemble(100, 1)
                nengo.Connection(c, d)
            nengo.Connection(b, c)
            nengo.Connection(d, a)
        nengo.Connection(result, a)

    layout = Layout(model)

    print layout.make_layout(model)


