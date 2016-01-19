from selenium import webdriver
import time 
import pytest
import os
import inspect
import nengo_gui
# each function should get the same driver...

@pytest.fixture(scope="module")
def driver(request):
    folder = os.path.dirname(inspect.getfile(nengo_gui))
    example = os.path.join(folder,'examples/default.py')
    try:
        driver = webdriver.Chrome('/usr/lib/chromium/chromedriver')
    except:
        driver = webdriver.Firefox()
    driver.get('localhost:8080/?filename='+example)
    driver.maximize_window()
    time.sleep(4)
    def fin():
        print ("teardown selenium-webdriver")
        driver.close()
    request.addfinalizer(fin)

    return driver




