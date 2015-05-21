import logging
import os
import pytest
import random
import sys
import threading
import traceback as tb
import time
import urllib2
from argparse import ArgumentTypeError

from selenium import webdriver

import nengo_viz
from constants import REQS_PATH, SS_NAME

CHROME, = ('chromedriver',)


def pytest_configure(config):
    os.environ["SELENIUM_SERVER_JAR"] = SS_NAME


@pytest.fixture(scope="module")
def viz(request):
    """Launches the Nengo visualizer server for the test."""
    filepath = str(request.fspath)  # test file
    filename = os.path.basename(filepath)
    if not filename.startswith('test_'):
        raise ValueError("Unexpected test filename: %s" % filename)

    # Get the model corresponding to the name for this test file
    modelname = 'model_' + filename[5:]
    modelpath = os.path.join(os.path.dirname(filepath), modelname)

    port = random.randrange(
        request.config.getvalue('portl'), request.config.getvalue('portu'))

    def doviz():
        logging.info("Launching nengo_viz (port=%d)", port)
        viz = nengo_viz.Viz(modelpath)
        try:
            viz.start(port=port, browser=False)
        except:
            logging.debug("Server raised exception, suppressed:\n%s",
                          tb.format_exc(()))

    threading.Thread(target=doviz).start()
    url = "http://localhost:%d" % port

    # Hack: wait for the server to start
    time.sleep(request.config.getvalue('vizdelay'))

    def shutdown_server():
        # Hack: need to make two requests to clean out the handle_request poll
        for u in (url + '/shutdown', url + '/hack'):
            try:
                urllib2.urlopen(u).read()
            except:
                logging.debug("Client raised exception, suppressed:\n%s",
                              tb.format_exc())

    request.addfinalizer(shutdown_server)
    return url


@pytest.fixture(scope="function")
def driver(request, viz):
    """Provides the selenium driver for the particular test page."""
    name = request.config.getvalue('driver')
    logging.info("Using Selenium webdriver: %s", name)
    if name == CHROME:
        d = webdriver.Chrome(os.path.join(REQS_PATH, name))
    else:
        assert False  # enforced by driver_name function
    request.addfinalizer(lambda: d.close())
    d.set_page_load_timeout(request.config.getvalue('timeout'))
    d.get(viz)
    return d


def driver_name(browser):
    b = browser.lower()
    if b.startswith('chrome'):
        return CHROME
    else:
        raise ArgumentTypeError("Unknown browser: %s" % browser)


def pytest_addoption(parser):
    parser.addoption(
        '--browser', action='store', dest='driver', type=driver_name,
        default='chrome', help='Browser to use with Selenium [chrome]')
    parser.addoption(
        '--portl', action='store', dest='portl', type=int,
        default=8080, help='Lower range of ports to launch nengo_viz server')
    parser.addoption(
        '--portu', action='store', dest='portu', type=int,
        default=9999, help='Upper range of ports to launch nengo_viz server')
    parser.addoption(
        '--timeout', action='store', dest='timeout', type=float,
        default=10, help='Page load timeout for Selenium')
    parser.addoption(
        '--vizdelay', action='store', dest='vizdelay', type=float,
        default=1.0, help='Time delay (seconds) for nengo_viz to load')
