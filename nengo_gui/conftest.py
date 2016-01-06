from selenium import webdriver
import time 
import nengo_gui
import pytest
import os
import inspect
# each function should get the same driver...

@pytest.fixture(scope="module")
def driver(request):
    folder = os.path.dirname(inspect.getfile(nengo_gui))
    example = os.path.join(folder,'examples/default.py')
    driver = webdriver.Firefox()
    driver.get('localhost:8080/?filename='+example)
    time.sleep(4)
    def fin():
        print ("teardown selenium-webdriver")
        driver.close()
    request.addfinalizer(fin)
    return driver

