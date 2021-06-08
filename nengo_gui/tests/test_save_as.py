import os
import time

import nengo_gui  # Imported to find project_root
from nengo_gui import testing_tools as tt


def download_file(driver, name_of_file):
    time.sleep(1)
    file_name = driver.find_element_by_xpath('//*[@id="filename"]')
    file_name.click()
    time.sleep(0.25)

    field = driver.find_element_by_xpath('//*[@id="save-as-filename"]')
    time.sleep(0.3)
    field.clear()
    time.sleep(0.25)
    field.send_keys(name_of_file)
    time.sleep(0.2)

    accept = driver.find_element_by_xpath('//*[@id="OK"]')
    accept.click()

    time.sleep(5)


def test_save_as(driver):
    # Saves the default.py file as test_download, tests whether it downloaded
    # correctly.
    tt.reset_page(driver)
    download_file(driver, "nengo_gui/examples/test_download.py")

    # Finds files to be read
    project_root = os.path.dirname(nengo_gui.__file__)
    test_file = os.path.join(project_root, "examples", "test_download.py")
    test_file_conf = os.path.join(project_root, "examples", "test_download.py.cfg")
    default_file = os.path.join(project_root, "examples", "default.py")

    assert os.path.isfile(test_file)
    with open(test_file, "r") as f1:
        test_code = f1.read()
    with open(default_file, "r") as f2:
        default_code = f2.read()

    assert test_code == default_code

    # Deletes downloaded files
    os.remove(test_file)
    os.remove(test_file_conf)

    download_file(driver, "nengo_gui/examples/default.py")
    time.sleep(2)
    try:
        alert = driver.switch_to_alert()
        alert.accept()
    except:
        assert False, "No warning present"
