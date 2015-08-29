def test_node_slider(driver):
    actions = ActionChains(driver)
    node = driver.find_element_by_css_selector("g.node:nth-child(3)")
    node.click()

    menu = driver.find_element_by_id('GUI_popup_menu')
    buttons = driver.find_elements_by_css_selector('#GUI_popup_menu button')
    for button in buttons:
        text = button.get_attribute('textContent')
        if text == 'Slider':
            button.click()
            break