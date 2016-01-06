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
	driver = webdriver.Firefox()
	driver.get("http://localhost:8080/")
	return driver

	
