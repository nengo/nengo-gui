import time
from nengo_gui import conftest
from nengo_gui import testing_tools as tt


def test_spike_plot(driver):
	stim_vals = [-1, 0, 1]
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
		assert(len(spike_data) > 10)
		for spike in spike_data:
			if(len(spike) != 0):
				signal_acc = True
				break
		tt.start_stop_sim(driver)
		if(signal_acc):
			break
	assert(signal_acc)
