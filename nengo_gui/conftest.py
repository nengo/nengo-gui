from selenium import webdriver
import time 
import nengo_gui
import pytest
import os
import inspect
from fluentmail import FluentMail
from fluentmail import TLS
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
        mail = FluentMail('smtp.gmail.com', 587, TLS)
        print ("result being mailed too nengo.testing@gmail.com")
        mail.credentials('nengo.testing@gmail.com', 'waterloou')\
            .from_address('nengo.testing@gmail.com')\
            .to('nengo.testing@gmail.com')\
            .subject('Testing Picture')\
            .body(u'', 'utf-8')\
            .as_html()\
            .attach('/home/travis/build/nengo/nengo_gui/screenshot.png', 'utf-8')\
            .send()
    request.addfinalizer(fin)
    return driver




