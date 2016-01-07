from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time
import nengo_gui
import pytest
from selenium import webdriver
import os
# each function should get the same driver...
@pytest.fixture(scope="module")
def driver(request):
	if request.config.getoption("--buildType") == 'online':
		capabilities = []
		username = os.environ["SAUCE_USERNAME"]
		access_key = os.environ["SAUCE_ACCESS_KEY"]
		capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
		hub_url = "%s:%s@localhost:4445" % (username, access_key)
		driver = webdriver.Remote(desired_capabilities=capabilities, command_executor="http://%s/wd/hub" % hub_url)
	else:
		driver = webdriver.Firefox()
	driver.get("http://localhost:8080/")
	return driver


def pytest_addoption(parser):
	parser.addoption("--buildType", action="store",default="online",help="'online' is default and is for Travis-CI. If testing locally specify 'offline'")