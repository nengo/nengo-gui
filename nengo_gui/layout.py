from collections import OrderedDict

import nengo
from nengo_gui.grandalf.graphs import Edge, Graph, Vertex
from nengo_gui.grandalf.layouts import SugiyamaLayout, VertexViewer


class Layout(object):
    """Generates layouts for nengo Networks"""

    def __init__(self, model):
        self.model = model

        # dictionary to keep track of parents of items in Network
        self.parents = {}

        # subnetworks that have not yet been examined for parents
        self.unexamined_networks = [model]

    def find_parent(self, obj):
        """Return the parent of an object in the model.

        The layout system needs to know the parents of items so that it can
        handle a Connection into a deeply nested subnetwork (that Connection
        should be treated as a Connection to the Network that is a direct
        child of the Network we are currently laying out).  But, we don't
        want to do a complete search of the entire graph.  So, instead we
        do an incremental breadth-first search until we find the component
        we are looking for.
        """
        if obj is self.model:
            # the top Network does not have a parent
            return None
        parent = self.parents.get(obj, None)
        while parent is None:
            if len(self.unexamined_networks) == 0:
                # there are no networks left we haven't looked into
                # this should not happen in a valid nengo.Network
                print("could not find parent of", obj)
                return None
            # grab the next network we haven't looked into
            net = self.unexamined_networks.pop(0)
            # identify all its children
            for n in net.nodes:
                self.parents[n] = net
            for e in net.ensembles:
                self.parents[e] = net
            for n in net.networks:
                self.parents[n] = net
                # add child networks into the list to be searched
                self.unexamined_networks.append(n)
            parent = self.parents.get(obj, None)
        return parent

    def compute_bounds(self, core):
        """Determine the min/max x/y values in the graph_core"""
        minx = None
        maxx = None
        miny = None
        maxy = None

        for v in core.V():
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
        """Generate a feed-forward layout for this network"""

        # build the graph to pass into grandalf
        # note that grandalf flows from top to bottom, so x and y are switched
        # from what we do in nengo_gui (so the flow is left to right)
        vertices = OrderedDict()
        for n in network.nodes:
            vertices[n] = Vertex(n)
            # default sizes for nodes: 10x20
            vertices[n].view = VertexViewer(w=8, h=16)
        for e in network.ensembles:
            vertices[e] = Vertex(e)
            # default sizes for ensembles: 10x20
            vertices[e].view = VertexViewer(w=10, h=20)
        for n in network.networks:
            vertices[n] = Vertex(n)
            # default sizes for networks: 40x40
            vertices[n].view = VertexViewer(w=40, h=40)

        # define the connections.  Any connection to a component inside a
        # subnetwork is replaced with a connection to the parent that is a
        # direct child of this network
        edges = OrderedDict()
        for c in network.connections:
            pre = c.pre_obj
            if isinstance(pre, nengo.ensemble.Neurons):
                pre = pre.ensemble
            while pre not in vertices:
                pre = self.find_parent(pre)
                if pre is None:
                    break
            post = c.post_obj
            if isinstance(post, nengo.connection.LearningRule):
                post = post.connection.post
                if isinstance(post, nengo.base.ObjView):
                    post = post.obj
            if isinstance(post, nengo.ensemble.Neurons):
                post = post.ensemble
            while post not in vertices:
                post = self.find_parent(post)
                if post is None:
                    break

            if pre is None or post is None:
                # the connection does not go to a child of this network,
                # so ignore it.
                print("error processing", c)
            else:
                edges[c] = Edge(vertices[pre], vertices[post], data=c)

        # generate the graph. Since OrderedDict instances are used for both
        # vertices and edges, the output generated by grandalf will be stable.
        graph = Graph(vertices.values(), edges.values())

        # do the layouts.  Note that each graph core is laid out separately,
        # since the layout algorithm requires a connected graph.  (The graph
        # cores are the separate connected graphs in the full network)
        layouts = [SugiyamaLayout(g) for g in graph.C]
        for layout in layouts:
            layout.init_all()
            layout.draw(3)  # do three passes to improve crossings

        # now rescale all the layouts to fit within a (0,0,1,1) bounding box

        bounds = [self.compute_bounds(g) for g in graph.C]

        widths = [b[2] - b[0] for b in bounds]
        heights = [b[3] - b[1] for b in bounds]

        # amount of spacing between cores and the margin around the space
        # This is in graph layout units
        spacing = 5

        # total width of all graphs
        total_width = sum(widths) + spacing * (len(widths) + 1)

        scale_x = 1.0 / total_width

        # starting location in network position units (0 to 1)
        x0 = spacing * scale_x

        pos = {}

        # do the rescaling
        # minx, miny, maxx, maxy are in the space of the core being laid out
        # x0, y0, x1, y1 are in the space of the network positions
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

            # place the next core beside this one
            x0 = x1 + spacing * scale_x

        return pos
