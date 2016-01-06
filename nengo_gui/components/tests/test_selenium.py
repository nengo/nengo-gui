from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time

def test_graph_select(driver):
	#adding a connectionfile to
	actions = ActionChains(driver)
	element = driver.find_element_by_xpath('//*[@class="graph"][2]')
	actions.drag_and_drop_by_offset(element,-10,-10).perform()
	text = element.get_attribute('textContent')
	assert text == 'a-1.01.00.000-0.500'

def test_node_labels(driver):
    nodes = driver.find_elements_by_xpath('//*[@class="graph"]')
    for n in nodes:
        n_text = n.get_attribute('textContent')
        assert n_text != ''