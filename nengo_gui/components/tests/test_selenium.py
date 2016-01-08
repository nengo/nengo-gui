from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time

#This tests if selenium can find the Code editor and checks if it can take text from it. 
def test_simple_selenium(driver):
	#adding a connectionfile to
	testString = """import nengo
		model = nengo.Network()
		with model:
		    stim = nengo.Node([0])
		    a = nengo.Ensemble(n_neurons=50, dimensions=1)
		    nengo.Connection(stim, a)
    """
	element = driver.find_element_by_xpath('//*[@class="ace_content"]')
	text = element.get_attribute('textContent')
	assert ''.join(text.split()) == ''.join(testString.split())

def test_graph_select(driver):
	#adding a connectionfile to
	graphComponents = ['a','stim']
	actions = ActionChains(driver)
	nodes = driver.find_elements_by_xpath('//*[@class="graph"]')
	nodesLabel = driver.find_elements_by_xpath('//*[@class="graph"]/*[@class="label unselectable"]')
	for count, node in enumerate(nodes):
		actions.drag_and_drop_by_offset(node,-10,-10).perform()
	for count, nodeLabel in enumerate(nodesLabel):
		text = nodeLabel.get_attribute('textContent')
		assert text == graphComponents[count]

def test_node_labels(driver):
    nodes = driver.find_elements_by_xpath('//*[@class="graph"]')
    for n in nodes:
        n_text = n.get_attribute('textContent')
        assert n_text != ''
