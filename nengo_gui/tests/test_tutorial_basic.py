import time

import pytest
from nengo_gui import testing_tools as tt

test_files = tt.folder_location("examples/tutorial")
ignore = ["spa", "networks"]
test_files = [f for f in test_files if not any(i in f for i in ignore)]
# Gets rid of SPA and Network files


@pytest.mark.parametrize("test_file", test_files)
def test_tutorial_basic(driver, test_file):
    # Tests the first 18 tutorials. These are the tutorials that do not
    # utilize networks or SPA which require a different format of test

    # Test page response by clicking the reset button and applying
    # new code to ace-editor
    tt.reset_page(driver)
    time.sleep(1)
    tt.update_editor(driver, test_file)
    tt.mouse_scroll(driver, 500)
    time.sleep(2)
    side_script = (
        "var right = document.getElementById('rightpane');\n"
        "right.style.width = '200px';\n"
    )
    driver.execute_script(side_script)

    node_objects = driver.find_elements_by_xpath('//*[@class="node"]')
    ens_objects = driver.find_elements_by_xpath('//*[@class="ens"]')

    node_number = test_file.count("nengo.Node")
    ens_number = test_file.count("nengo.Ensemble")

    # Makes sure the correct number of ensembles and nodes were rendered
    assert len(node_objects) / 2 == node_number
    assert len(ens_objects) / 2 == ens_number

    # Tests whether the file compiles and runs
    hang_time = 25  # alloted time until test fails

    time_script = "var time = $('#ticks_tr');\n" "return time.find('td').text()\n"
    tt.start_stop_sim(driver)
    time_start = time.time()
    while time.time() - time_start < hang_time:
        sim_time = driver.execute_script(time_script)
        if float(sim_time) > 0:
            break
        time.sleep(0.1)
    else:
        assert False, "Did not compile in %f seconds" % hang_time
