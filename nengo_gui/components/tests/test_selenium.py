from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time
import nengo_gui
#This tests if selenium can find the Code editor and checks if it can take text from it. 
def test_simple_selenium(driver):
	#adding a connectionfile to
	testString = """
# Nengo Network: Ensemble Array
#
# An ensemble array is a group of ensembles that each represent a part of the
# overall signal.
#
# Ensemble arrays are similar to normal ensembles, but expose a slightly
# different interface. Additionally, in an ensemble array, the components of
# the overall signal are not related. As a result, network arrays cannot be
# used to compute nonlinear functions that mix the dimensions they represent.

import nengo
import numpy as np

model = nengo.Network()
with model:
    # Make an input node
    sin = nengo.Node(lambda t: [np.cos(t), np.sin(t)])

    # Make ensembles to connect
    a = nengo.networks.EnsembleArray(n_neurons=100, n_ensembles=2)
    b = nengo.Ensemble(n_neurons=100, dimensions=2)
    c = nengo.networks.EnsembleArray(n_neurons=100, n_ensembles=2)

    # Connect the model elements, just feedforward
    nengo.Connection(sin, a.input)
    nengo.Connection(a.output, b)
    nengo.Connection(b, c.input)
	"""
	update_editor(driver,testString)
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

def update_editor(driver,nengoCode):
	nengoCode = nengoCode.replace("\n","\\n").replace("\r","\\r")
	driver.execute_script("var editor = ace.edit('editor'); editor.setValue('"+nengoCode+"');")
	time.sleep(1)