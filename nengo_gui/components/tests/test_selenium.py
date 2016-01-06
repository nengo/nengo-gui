from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time

def test_graphSelect():
	driver = webdriver.Firefox()
	driver.get("http://localhost:8080/")
	time.sleep(3)
	actions = ActionChains(driver)
	element = driver.find_element_by_xpath('//*[@class="graph"][2]')
	actions.drag_and_drop_by_offset(element,-10,-10).perform()
	assert bool(element) == True
