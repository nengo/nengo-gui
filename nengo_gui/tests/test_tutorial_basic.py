import os
import sys
import time
import traceback
import pytest
from selenium.webdriver import ActionChains
from nengo_gui import conftest
from nengo_gui import testing_tools as tt


test_files = tt.folder_location('examples/tutorial')
ignore = ["SPA","Tutorial 18: Networks"]
test_files = filter(lambda x: not (ignore[0] in x or ignore[1] in x), test_files)
# Gets rid of SPA and Network files

@pytest.mark.parametrize('test_file', test_files)
def test_tutorial_basic(driver, test_file):
	# Tests the first 18 tutorials, these are the tutorials that do not
	# utilize networks or SPA which require a different format of test

	try:
		#Test page response by clicking the reset button and applying new code to ace-editor

		tt.reset_page(driver)
		tt.update_editor(driver, test_file)

		side_script = '''var right = document.getElementById("rightpane"); \
		right.style.width = "200px"
		'''
		driver.execute_script(side_script)

		node_objects = driver.find_elements_by_xpath('//*[@class="node"]')
		ens_objects = driver.find_elements_by_xpath('//*[@class="ens"]')

		node_number = test_file.count("nengo.Node")
		ens_number = test_file.count("nengo.Ensemble")

		# Makes sure the correct number of ensembles and nodes were rendered
		assert(len(node_objects)/2 == node_number)
		assert(len(ens_objects)/2 == ens_number)

		# Tests whether the file compiles and runs

		hang_time = 25 # alloted time until test fails


		compiled = False
		tt.start_stop_sim(driver)
		time_start = time.time()
		while(time.time() - time_start < hang_time):
			time_script = 'var time = $("#ticks_tr"); \
			return time.find("td").text()'
			sim_time = driver.execute_script(time_script)
			if(float(sim_time) > 0):
				compiled = True
				break
			time.sleep(0.1)

		assert(compiled)

	except Exception, e:
		#Travis Only: On fail takes screenshot and uploads it to imgur


		if('TRAVIS' in os.environ):
			tt.imgur_screenshot(driver)

		_, _, tb = sys.exc_info()
		traceback.print_tb(tb) # Fixed format
		tb_info = traceback.extract_tb(tb)
		filename, line, func, text = tb_info[-1]

		print('An error occurred on line {} in statement {}'.format(line, text))
		print(str(e))
		exit(1)
