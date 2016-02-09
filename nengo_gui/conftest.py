from selenium import webdriver
import time
import pytest
from selenium import webdriver

@pytest.fixture(scope="module")
def driver(request):

    driver = webdriver.Firefox()
    driver.get('localhost:8080/')
    driver.maximize_window()
    time.sleep(4)

    def fin():
        driver.close()

    request.addfinalizer(fin)
    try:
        assert driver.title != "Problem loading page"

    except AssertionError:
        print "ERROR: The nengo_gui server is not currently running. \
        Start the server before running tests."
        raise
    return driver
