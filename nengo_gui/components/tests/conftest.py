from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time
import nengo_gui
import pytest
from selenium import webdriver

# each function should get the same driver...
@pytest.fixture(scope="module")
def driver(request):
	if request.config.getoption("--buildType") == 'online':
		username = os.environ["nengo"]
		access_key = os.environ["21faaee4-a99e-4b40-bc89-23170618ff0e"]
		capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
		hub_url = "%s:%s@localhost:4445" % (username, access_key)
		driver = webdriver.Remote(desired_capabilities=capabilities, command_executor="http://%s/wd/hub" % hub_url)
	driver = webdriver.Firefox()
	driver.get("http://localhost:8080/")
	return driver


def pytest_addoption(parser):
	parser.addoption("--buildType", action="store",default="online",help="'online' is default and is for Travis-CI. If testing locally specify 'offline'")