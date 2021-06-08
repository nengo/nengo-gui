import time

from nengo_gui import testing_tools as tt
from selenium.webdriver import ActionChains


def test_data_to_csv(driver):
    tt.reset_page(driver)

    tt.update_editor(
        driver,
        """
import nengo
model = nengo.Network()
with model:
    stim = nengo.Node([0])
    a = nengo.Ensemble(n_neurons=50, dimensions=1)
    nengo.Connection(stim, a)
    """,
    )

    time.sleep(1)

    actions = ActionChains(driver)
    elements = ["node", "ens"]
    for elem in elements:
        for x in range(2):
            node = driver.find_element_by_xpath('//*[@class="' + elem + '"]')

            actions = ActionChains(driver)
            actions.move_to_element(node)
            actions.context_click()
            actions.perform()
            time.sleep(1)
            actions = ActionChains(driver)

            menu = driver.find_element_by_xpath(
                '//*[@class="dropdown-menu"]/li[%d]' % (x + 1)
            )
            actions.move_to_element(menu)
            actions.click()
            actions.perform()

            time.sleep(0.5)
    result = driver.execute_script(
        """
a = function() {
    var data_set = Nengo.Component.components;
    data_set.forEach(function(data, index) {
        if (data.constructor === Nengo.Value) {
            data.data_store.reset();
            data.data_store.push([1, 10+index]);
        }
    });
    return data_to_csv(data_set);
};
return a();
    """
    )

    test_data = "Graph Name,stim,a\n" "Times,Dimension1,Dimension1\n" "1,11,12"

    assert result == test_data
