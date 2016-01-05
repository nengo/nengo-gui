from selenium import webdriver
import time 
import nengo_gui
import pytest
from selenium import webdriver
import os
import inspect
# each function should get the same driver...
<<<<<<< HEAD

=======
>>>>>>> 22081e1... added yaml file for travis
@pytest.fixture(scope="module")
def driver(request):
	folder = os.path.dirname(inspect.getfile(nengo_gui))
	example = os.path.join(folder,'examples/default.py')
<<<<<<< HEAD
	try:
		capabilities = {}
		username = os.environ["SAUCE_USERNAME"]
		access_key = os.environ["SAUCE_ACCESS_KEY"]
		capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
		capabilities["browserName"] = 'chrome'
		capabilities["build"] = os.environ['TRAVIS_BUILD_NUMBER']
		hub_url = "%s:%s@localhost:4445" % (username, access_key)
		driver = webdriver.Remote(desired_capabilities=capabilities, command_executor="http://%s/wd/hub" % hub_url)
	except:                                                  #Setup Code for offline testing
		driver = webdriver.Firefox()
	driver.get('localhost:8080/?filename='+example)
	time.sleep(4)
=======
	# try:
	# 	capabilities = {}
	# 	username = os.environ["SAUCE_USERNAME"]
	# 	access_key = os.environ["SAUCE_ACCESS_KEY"]
	# 	capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
	# 	capabilities["browserName"] = 'chrome'
	# 	capabilities["build"] = os.environ['TRAVIS_BUILD_NUMBER']
	# 	hub_url = "%s:%s@localhost:4445" % (username, access_key)
	# 	driver = webdriver.Remote(desired_capabilities=capabilities, command_executor="http://%s/wd/hub" % hub_url)
	# except:                                                  #Setup Code for offline testing
	driver = webdriver.Firefox()
	driver.get('localhost:8080/?filename='+example)
	time.sleep(6)
>>>>>>> 22081e1... added yaml file for travis
	return driver

