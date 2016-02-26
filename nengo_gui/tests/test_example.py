import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
from nengo_gui import conftest
from nengo_gui import testing_tools as tt

#^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
# Use these import statments, they will be useful when testing

@pytest.mark.skipif("('TRAVIS' in os.environ)") #Skips test on TravisCI
def test_example(driver):
	# Always include driver as a function parameter.
	# This is the selenium webdriver that will allow
	# you to interact with the webpage.

	tt.reset_page(driver)
	# Most testing_tools functions require driver as an input.
	# Presses the reset button to start the page fresh.
	# Usually useful but not always needed.
	# More documentation on testing_tools can be found
	# in nengo_gui/testing_tools.py

	time.sleep(1)
	# Waits a small amount of time to ensure the page has
	# time to reset.

	tt.update_editor(driver,'''
import nengo

model = nengo.Network()
with model:
    stim = nengo.Node([0])
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim, a)
		''')
	# The page will now load this code into the code editor

	stim = driver.find_element_by_xpath('//*[@class="node"]')
	a = driver.find_element_by_xpath('//*[@class="ens"]')
	# Finds the 'stim' and 'a' nodes and saves them as a webElements.

	action = ActionChains(driver)
	# ActionChains allow you to link together multiple mouse events
	# then execute them in that order.

	action.move_to_element(stim);
	action.context_click()
	action.perform()
	time.sleep(1)
	# The stim element has now been right clicked.

	# WARNING: when using ActionChains reinitialize ActionChains
	# after every .perform() call, it is not clear why but
	# ActionChains does not seem to reset properly after this call.

	right_click_menu = driver.find_element_by_xpath('//*[@class="dropdown-menu"]')

	assert(bool(stim) and bool(a) == True)
	# Tests if both elements are present.

	assert(bool(right_click_menu) == True)
	# Tests if stim has been properly clicked

	if('TRAVIS' in os.environ): ########## TRAVIS ONLY
		tt.imgur_screenshot(driver)

	# When testing on TravisCI tests cannot be visualized, this function
	# takes a screenshot of the test, uploads it to imgur and prints
	# the link. Again this is only useful when testing on travis.

	# And thats it! look at test_basic_functionality.py for more usage and
	# the documentation in the pull request. Happy Testing!
