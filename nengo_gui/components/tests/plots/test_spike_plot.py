import time
from nengo_gui import conftest
from nengo_gui import testing_tools as tt

def test_spike_plot(driver):
	tt.reset_page(driver)
	tt.update_editor(driver,"""
import nengo

model = nengo.Network()
with model:
    stim = nengo.Node([1])
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim, a)
	""")
	ens = driver.find_element_by_xpath('//*[@class="ens"]')
	tt.menu_click(driver,ens,'Spikes')
	time.sleep(7)
