from __future__ import print_function

import time

import pytest
from selenium.webdriver import ActionChains

from . import (
    folder_location, mouse_scroll, reset_page, start_stop_sim, update_editor)


@pytest.mark.parametrize('test_file', folder_location('examples/basics'))
def test_basic_functionality(driver, test_file):
    """Test page response.

    Does this by clicking the reset button and applying new code to editor.
    """

    reset_page(driver)
    time.sleep(0.5)
    update_editor(driver, test_file)
    mouse_scroll(driver, 500)
    ens_elements = driver.find_elements_by_xpath('//*[@class="ens"]')
    assert (len(ens_elements) > 0)
    side_script = ("var right = document.getElementById('rightpane');\n"
                   "right.style.width = '200px';")

    driver.execute_script(side_script)

    # Creates graph objects by right clicking and selecting from menu
    actions = ActionChains(driver)
    elements = ['node', 'ens']
    for elem in elements:
        node = driver.find_element_by_xpath('//*[@class="'+elem+'"]')
        actions = ActionChains(driver)
        actions.move_to_element(node)
        actions.context_click()
        actions.perform()
        time.sleep(1)
        actions = ActionChains(driver)
        menu = driver.find_element_by_xpath(
            '//*[@class="dropdown-menu"]/li[1]')
        actions.move_to_element(menu)
        actions.click()
        actions.perform()
        time.sleep(0.5)

    graph_elements = driver.find_elements_by_xpath('//*[@class="graph"]')

    assert len(graph_elements) > 0
    start_stop_sim(driver)
    time.sleep(1.5)
    start_stop_sim(driver)
    time.sleep(0.5)

    ticker = driver.find_element_by_xpath('//*[@id="ticks_tr"]/td')
    sim_time = ticker.get_attribute('textContent')

    assert (float(sim_time) > 0)
