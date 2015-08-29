import logging
import os
import pytest
import random
import sys
import threading
import traceback as tb
import time
import urllib2
import shutil
from argparse import ArgumentTypeError

import nengo_gui

from selenium import webdriver

logging.basicConfig(filename='example.log',level=logging.DEBUG)

# each function should get the same driver...

@pytest.fixture(scope="module")
def driver(request):
    #Launches the Nengo GUI server for the test.
    filepath = str(request.fspath)  # test file
    filename = os.path.basename(filepath)
    if not filename.startswith('test_'):
        raise ValueError("Unexpected test filename: %s" % filename)

    # Get the model corresponding to the name for this test file
    modelname = 'model_' + filename[5:]
    modelpath = os.path.join(os.path.dirname(filepath), modelname)

    # each GUI instance needs it's own port
    port = random.randrange(
        request.config.getvalue('portl'), request.config.getvalue('portu'))
    driver = webdriver.Firefox()

    def do_gui():
        logging.info("Launching nengo_gui (port=%d)", port)
        gui = nengo_gui.GUI(modelpath, interactive=False)
        try:
            gui.start(port=port, browser=False)
        except:
            logging.debug("Server raised exception, suppressed:\n%s",
                          tb.format_exc(()))

    # start the server in it's own thread
    threading.Thread(target=do_gui).start()
    url = "http://localhost:%d" % port

    # Hack: wait for the server to start
    time.sleep(request.config.getvalue('guidelay'))

    def shutdown_server():
        # Hack: need to make two requests to clean out the handle_request poll
        for u in (url + '/shutdown', url + '/hack'):
            try:
                urllib2.urlopen(u).read()
            except:
                logging.debug("Client raised exception, suppressed:\n%s",
                              tb.format_exc())
        driver.close()

    request.addfinalizer(shutdown_server)

    driver.get("http://localhost:%s" %port)
    return driver

def pytest_addoption(parser):
    parser.addoption(
        '--portl', action='store', dest='portl', type=int,
        default=8080, help='Lower range of ports to launch nengo_gui server')
    parser.addoption(
        '--portu', action='store', dest='portu', type=int,
        default=9999, help='Upper range of ports to launch nengo_gui server')
    parser.addoption(
        '--timeout', action='store', dest='timeout', type=float,
        default=10, help='Page load timeout for Selenium')
    parser.addoption(
        '--guidelay', action='store', dest='guidelay', type=float,
        default=1.0, help='Time delay (seconds) for nengo_gui to load')
