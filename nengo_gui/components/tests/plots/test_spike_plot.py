import os
import sys
import time
import traceback
from nengo_gui import conftest
from nengo_gui import testing_tools as tt


def test_spike_plot(driver):
	try:
		stim_vals = [-1, 0, 1]
		spike_count = 0
		for val in stim_vals:
			tt.reset_page(driver)
			tt.update_editor(driver, """
import nengo

model = nengo.Network()
with model:
    stim = nengo.Node([{}])
    a = nengo.Ensemble(n_neurons=1, dimensions=1)
    nengo.Connection(stim, a)
			""".format(val))
			ens = driver.find_element_by_xpath('//*[@class="ens"]')
			stim = driver.find_element_by_xpath('//*[@class="node"]')
			tt.menu_click(driver, ens, 'Spikes')
			tt.menu_click(driver, stim, 'Slider')

			tt.start_stop_sim(driver)
			time.sleep(2)
			spike_data = driver.execute_script("""
			var ens = Nengo.Component.components[0];
			var data = ens.data_store.data[0];
			return data;
			""")
			signal_acc = False

			for spike in spike_data:
				if(len(spike) != 0):
					spike_count += 1

			tt.start_stop_sim(driver)
			if(spike_count > 100):
				break
		assert(spike_count > 100)

	except Exception as e:
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
