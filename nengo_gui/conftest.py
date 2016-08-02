from __future__ import print_function

import os
import socket
import threading

import pytest
from selenium import webdriver

import nengo_gui
from nengo_gui import guibackend
from nengo_gui.gui import BaseGUI

if 'TRAVIS' in os.environ:
    import pyimgur


@pytest.yield_fixture(scope="session")
def gui():
    host, port = ('localhost', 0)
    server_settings = guibackend.GuiServerSettings((host, port))
    model_context = guibackend.ModelContext(
        filename=os.path.join(nengo_gui.__path__[0], 'examples', 'default.py'))
    gui = BaseGUI(model_context, server_settings)
    server_thread = threading.Thread(target=gui.start)
    server_thread.start()
    port = gui.server.server_port

    started = False
    while server_thread.is_alive() and not started:
        try:
            s = socket.create_connection((host, port), 0.1)
            started = True
        except:
            pass
        else:
            s.close()

    yield gui

    gui.server.shutdown()
    gui.server.wait_for_shutdown(0.05)


def imgur_screenshot(driver):
    """Takes a screenshot, uploads it to imgur, and prints the link."""

    driver.get_screenshot_as_file('test_result.png')
    client_id = 'ce3e3bc9c9f0af0'
    client_secret = 'b033592e871bd14ac89d3e7356d8d96691713170'
    im = pyimgur.Imgur(client_id, client_secret)

    path = os.path.join(os.getcwd(), 'test_result.png')
    uploaded_image = im.upload_image(path, title="Uploaded to Imgur")
    os.remove('test_result.png')
    print()
    print(uploaded_image.title)
    print(uploaded_image.link)


@pytest.yield_fixture(scope="session")
def driver(gui):
    driver = webdriver.Firefox()
    driver.get('localhost:{port}/'.format(port=gui.server.server_port))
    driver.maximize_window()

    assert driver.title != "Problem loading page"
    yield driver

    driver.quit()


def pytest_exception_interact(node, call, report):
    """Uploads a screenshot to imgur on selenium test failures."""
    if 'TRAVIS' in os.environ and report.failed and 'driver' in node.funcargs:
        imgur_screenshot(node.funcargs['driver'])
