from __future__ import print_function

import time

import pytest
from nengo_gui import testing_tools as tt
from selenium.webdriver import ActionChains

test_files = tt.folder_location("examples/basics")


@pytest.mark.parametrize("test_file", test_files)
def test_basic_functionality(driver, test_file):
    # Test page response by clicking the reset button and applying
    # new code to ace-editor
    tt.reset_page(driver)
    time.sleep(0.5)
    tt.update_editor(driver, test_file)
    tt.mouse_scroll(driver, 500)
    ens_elements = driver.find_elements_by_xpath('//*[@class="ens"]')
    assert len(ens_elements) > 0
    side_script = (
        "var right = document.getElementById('rightpane');\n"
        "right.style.width = '200px';\n"
    )
    driver.execute_script(side_script)

    # Creates graph objects by right clicking and selecting
    actions = ActionChains(driver)
    elements = ["node", "ens"]
    for elem in elements:
        node = driver.find_element_by_xpath('//*[@class="' + elem + '"]')
        actions = ActionChains(driver)
        actions.move_to_element(node)
        actions.context_click()
        actions.perform()
        time.sleep(1)
        actions = ActionChains(driver)

        menu = driver.find_element_by_xpath('//*[@class="dropdown-menu"]/li[1]')
        actions.move_to_element(menu)
        actions.click()
        actions.perform()
        time.sleep(0.5)

    graph_elements = driver.find_elements_by_xpath('//*[@class="graph"]')

    assert len(graph_elements) > 0
    tt.start_stop_sim(driver)
    time.sleep(1.5)
    tt.start_stop_sim(driver)
    time.sleep(0.5)

    ticker = driver.find_element_by_xpath('//*[@id="ticks_tr"]/td')
    sim_time = ticker.get_attribute("textContent")

    assert float(sim_time) > 0
