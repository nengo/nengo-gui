import time

import pytest

from . import (
    folder_location, mouse_scroll, reset_page, start_stop_sim, update_editor)


test_files = [f for f in folder_location('examples/tutorial')
              if "SPA" not in f and "Tutorial 18: Networks" not in f]


@pytest.mark.parametrize('test_file', test_files)
def test_tutorial_basic(driver, test_file):
    """Tests the first 18 tutorials.

    These are the tutorials that do not utilize networks or SPA, which
    require a different format of test.
    """

    reset_page(driver)
    time.sleep(1)
    update_editor(driver, test_file)
    mouse_scroll(driver, 500)
    time.sleep(2)
    driver.execute_script("var right = document.getElementById('rightpane');\n"
                          "right.style.width = '200px';")

    node_objects = driver.find_elements_by_xpath('//*[@class="node"]')
    ens_objects = driver.find_elements_by_xpath('//*[@class="ens"]')

    node_number = test_file.count("nengo.Node")
    ens_number = test_file.count("nengo.Ensemble")

    # Makes sure the correct number of ensembles and nodes were rendered
    assert len(node_objects) // 2 == node_number
    assert len(ens_objects) // 2 == ens_number

    # Tests whether the file compiles and runs

    hang_time = 25  # alloted time until test fails

    start_stop_sim(driver)
    time_start = time.time()
    while time.time() - time_start < hang_time:
        sim_time = driver.execute_script("var time = $('#ticks_tr');\n"
                                         "return time.find('td').text();")
        if float(sim_time) > 0:
            break

        time.sleep(0.1)
    else:
        assert False, "Timeout"
