import time

import pytest
from nengo_gui import testing_tools as tt


@pytest.mark.skipif(True, reason="Halts future tests")
def test_pdb_error(driver):
    test_file = """
import nengo
import pdb

model = nengo.Network()
with model:
    pdb.set_trace()
    stim = nengo.Node([0])
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim, a)
    """
    tt.reset_page(driver)
    tt.update_editor(driver, test_file)
    time.sleep(0.5)
    tt.start_stop_sim(driver)
    time.sleep(1.5)
    tt.start_stop_sim(driver)
    time.sleep(0.5)

    ticker = driver.find_element_by_xpath('//*[@id="ticks_tr"]/td')
    sim_time = ticker.get_attribute("textContent")

    assert float(sim_time) > 0
