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
    try:
        capabilities = {}
        username = os.environ["SAUCE_USERNAME"]
        access_key = os.environ["SAUCE_ACCESS_KEY"]
        capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
        capabilities["browserName"] = 'chrome'
        capabilities["build"] = os.environ['TRAVIS_BUILD_NUMBER']
        hub_url = "%s:%s@localhost:4445" % (username, access_key)
        driver = webdriver.Remote(desired_capabilities=capabilities, command_executor="http://%s/wd/hub" % hub_url)
        driver.get('localhost:8080/?filename='+example)
        driver.maximize_window()
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




