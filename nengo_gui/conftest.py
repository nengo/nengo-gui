from selenium import webdriver
import time 
import pytest
import nengo_gui
# each function should get the same driver...

@pytest.fixture(scope="module")
def driver(request):
    try:
        #driver = webdriver.Chrome('/usr/lib/chromium/chromedriver')
        driver = webdriver.Firefox()
    except:
        driver = webdriver.Firefox()
    driver.get('localhost:8080/')
    driver.maximize_window()
    time.sleep(4)
    def fin():
        driver.close()
    request.addfinalizer(fin)

    return driver




