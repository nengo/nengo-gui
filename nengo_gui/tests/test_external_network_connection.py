from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time
import pytest
from nengo_gui import conftest
from nengo_gui import testing_tools as tt
import os
import sys
import traceback

@pytest.mark.xfail
def test_external_connect(driver):

	test_file = '''
import nengo

model = nengo.Network()
with model:
    a = nengo.Ensemble(10, 1)

b = nengo.networks.EnsembleArray(10,1)

with model:
    nengo.Connection(a, b.input)
	'''
	tt.reset_page(driver)
	tt.update_editor(driver,test_file)
	
	tt.start_stop_sim(driver)
	time.sleep(1.5)
	tt.start_stop_sim(driver)
	time.sleep(0.5)

	ticker = driver.find_element_by_xpath('//*[@id="ticks_tr"]/td')
	sim_time = ticker.get_attribute('textContent')
	
	assert (float(sim_time) > 0)