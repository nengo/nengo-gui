from __future__ import print_function

import os.path
import socket
import threading

import pytest
from selenium import webdriver

import nengo_gui
from nengo_gui import guibackend
from nengo_gui.gui import BaseGUI


@pytest.yield_fixture(scope="session")
def gui():
    print('a')
    host, port = ('localhost', 0)
    server_settings = guibackend.GuiServerSettings((host, port))
    model_context = guibackend.ModelContext(
        filename=os.path.join(nengo_gui.__path__[0], 'examples', 'default.py'))
    gui = BaseGUI(model_context, server_settings)
    server_thread = threading.Thread(target=gui.start)
    server_thread.daemon = True
    server_thread.start()
    port = gui.server.server_port

    started = False
    print('waiting for conn', host, port)
    while server_thread.is_alive() and not started:
        try:
            s = socket.create_connection((host, port), .1)
            started = True
        except:
            pass
        else:
            s.close()
    print('xxx')

    yield gui

    gui.server.shutdown()
    gui.server.wait_for_shutdown(0.05)


@pytest.yield_fixture(scope="session")
def driver(gui):
    print('b')
    driver = webdriver.Firefox()
    driver.get('http://localhost:{port}/'.format(port=gui.server.server_port))
    driver.maximize_window()

    print('c')
    assert driver.title != "Problem loading page"
    yield driver

    driver.quit()
