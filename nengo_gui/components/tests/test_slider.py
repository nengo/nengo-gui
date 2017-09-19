import json

import nengo
import numpy as np

from nengo_gui.components import Node, Slider


def test_create(client):
    with nengo.Network():
        n = nengo.Node(None, size_in=2)

    slider = Slider(client, Node(client, n, "n"), "slider")
    slider.create()
    assert json.loads(client.ws.text) == ["netgraph.create_slider", {
        "label": None,
        "n_sliders": 2,
        "start_value": [0.0, 0.0],
        "uid": "slider",
    }]


def test_passthrough(client, fast_client):
    with nengo.Network() as net:
        n = nengo.Node(None, size_in=2)

    dummy_backend = lambda: "nengo"
    dummy_dt = lambda: 0.001
    client.bind("simcontrol.get_backend", dummy_backend)
    client.bind("simcontrol.get_dt", dummy_dt)

    slider = Slider(client, Node(client, n, "n"), "slider")
    slider.attach(fast_client)
    slider.add_nengo_objects(net)

    step = n.output if callable(n.output) else n.output.make_step(
        shape_in=None, shape_out=n.size_out, dt=None, rng=None)

    assert fast_client.ws.binary is None
    assert n.output is not slider.base_output

    # Without overriding, output should be same as input
    assert (step(0.01, np.array([0.5, 0.5])) == np.array([0.5, 0.5])).all()
    assert (step(0.02, np.array([-0.5, -0.5])) == np.array([-0.5, -0.5])).all()
    # Value sent over fast client
    assert fast_client.ws.binary == np.array([-0.5, -0.5]).tobytes()

    # Override the second dimension
    fast_client.receive(np.array([np.nan, 0.0]).tobytes())
    assert (step(0.03, np.array([0.5, 0.5])) == np.array([0.5, 0.0])).all()
    assert (step(0.04, np.array([-0.5, -0.5])) == np.array([-0.5, 0.0])).all()
    # Whole value still sent over fast client
    assert fast_client.ws.binary == np.array([-0.5, -0.5]).tobytes()

    # Override both dimensions
    fast_client.receive(np.array([0.0, 0.0]).tobytes())
    assert (step(0.05, np.array([0.5, 0.5])) == np.array([0.0, 0.0])).all()
    assert (step(0.06, np.array([-0.5, -0.5])) == np.array([0.0, 0.0])).all()
    # Whole value still sent over fast client
    assert fast_client.ws.binary == np.array([-0.5, -0.5]).tobytes()

    # Reset, no longer override
    slider.reset()
    assert (step(0.07, np.array([0.5, 0.5])) == np.array([0.5, 0.5])).all()
    assert (step(0.08, np.array([-0.5, -0.5])) == np.array([-0.5, -0.5])).all()
    assert fast_client.ws.binary == np.array([-0.5, -0.5]).tobytes()

    slider.remove_nengo_objects(net)
    assert n.output is slider.base_output


def test_value(client, fast_client):
    with nengo.Network() as net:
        n = nengo.Node([1.0])

    dummy_backend = lambda: "nengo"
    dummy_dt = lambda: 0.001
    client.bind("simcontrol.get_backend", dummy_backend)
    client.bind("simcontrol.get_dt", dummy_dt)

    slider = Slider(client, Node(client, n, "n"), "slider")
    slider.attach(fast_client)
    slider.add_nengo_objects(net)

    step = n.output if callable(n.output) else n.output.make_step(
        shape_in=None, shape_out=n.size_out, dt=None, rng=None)

    assert n.output is not slider.base_output

    # Without overriding, should always output 1.0
    assert step(0.01) == 1.0
    assert step(0.02) == 1.0

    # Override the output
    fast_client.receive(np.array([-1.0]).tobytes())
    assert step(0.03) == -1.0
    assert step(0.04) == -1.0

    # Reset, no longer override
    slider.reset()
    assert step(0.05) == 1.0
    assert step(0.06) == 1.0

    # Value not sent over when using static output
    assert fast_client.ws.binary is None

    slider.remove_nengo_objects(net)
    assert n.output is slider.base_output


def test_callable(client, fast_client):
    with nengo.Network() as net:
        n = nengo.Node(lambda t: t)

    dummy_backend = lambda: "nengo"
    dummy_dt = lambda: 0.001
    client.bind("simcontrol.get_backend", dummy_backend)
    client.bind("simcontrol.get_dt", dummy_dt)

    slider = Slider(client, Node(client, n, "n"), "slider")
    slider.attach(fast_client)
    slider.add_nengo_objects(net)

    step = n.output if callable(n.output) else n.output.make_step(
        shape_in=None, shape_out=n.size_out, dt=None, rng=None)

    assert fast_client.ws.binary is None
    assert n.output is not slider.base_output

    # Without overriding output should be t
    assert step(0.01) == 0.01
    assert step(0.02) == 0.02
    # Value sent over fast client
    assert fast_client.ws.binary == np.array([0.02]).tobytes()

    # Override output
    fast_client.receive(np.array([-1.0]).tobytes())
    assert step(0.03) == -1.0
    assert step(0.04) == -1.0
    # Original value still sent over fast client
    assert fast_client.ws.binary == np.array([0.04]).tobytes()

    # Reset, no longer override
    slider.reset()
    assert step(0.05) == 0.05
    assert step(0.06) == 0.06
    assert fast_client.ws.binary == np.array([0.06]).tobytes()

    slider.remove_nengo_objects(net)
    assert n.output is slider.base_output


def test_process(client, fast_client):
    with nengo.Network() as net:
        n = nengo.Node(nengo.processes.PresentInput(
            inputs=[[0.1, 0.1], [0.2, 0.2]], presentation_time=0.01,
        ), size_out=2)

    dummy_backend = lambda: "nengo"
    dummy_dt = lambda: 0.001
    client.bind("simcontrol.get_backend", dummy_backend)
    client.bind("simcontrol.get_dt", dummy_dt)

    slider = Slider(client, Node(client, n, "n"), "slider")
    slider.attach(fast_client)
    slider.add_nengo_objects(net)

    step = n.output if callable(n.output) else n.output.make_step(
        shape_in=(0,), shape_out=(n.size_out,), dt=0.01, rng=None)

    assert fast_client.ws.binary is None
    assert n.output is not slider.base_output

    # Without overriding, output should be from process
    assert (step(0.01) == np.array([0.1, 0.1])).all()
    assert (step(0.02) == np.array([0.2, 0.2])).all()
    # Value sent over fast client
    print(np.frombuffer(fast_client.ws.binary))
    assert fast_client.ws.binary == np.array([0.2, 0.2]).tobytes()

    # Override the second dimension
    fast_client.receive(np.array([np.nan, 0.0]).tobytes())
    assert (step(0.03) == np.array([0.1, 0.0])).all()
    assert (step(0.04) == np.array([0.2, 0.0])).all()
    # Whole value still sent over fast client
    assert fast_client.ws.binary == np.array([0.2, 0.2]).tobytes()

    # Override both dimensions
    fast_client.receive(np.array([0.0, 0.0]).tobytes())
    assert (step(0.05) == np.array([0.0, 0.0])).all()
    assert (step(0.06) == np.array([0.0, 0.0])).all()
    # Whole value still sent over fast client
    assert fast_client.ws.binary == np.array([0.2, 0.2]).tobytes()

    # Reset, no longer override
    slider.reset()
    assert (step(0.07) == np.array([0.1, 0.1])).all()
    assert (step(0.08) == np.array([0.2, 0.2])).all()
    assert fast_client.ws.binary == np.array([0.2, 0.2]).tobytes()

    slider.remove_nengo_objects(net)
    assert n.output is slider.base_output
