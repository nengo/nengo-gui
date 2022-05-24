from __future__ import print_function

import inspect
import os
import time

import nengo_gui


def update_editor(driver, nengoCode):

    """Inserts a string which represents code into ace editor

    Example:
    driver = webdriver.firefox()
    driver.get(localhost:8080/)
    code_string = "print hello world"
    update_editor(driver, code_string)
    Ace editor will update with "print hello world"
    """

    nengoCode = nengoCode.replace("\n", "\\n").replace("\r", "\\r")
    js = "var editor = ace.edit('editor');editor.setValue('" + nengoCode + "');"
    driver.execute_script(js)
    time.sleep(1)


def reset_page(driver):

    """Resets the Nengo gui page

    Example:
    driver = webdriver.firefox()
    driver.get(localhost:8080/)
    reset_page(driver)
    The page then resets
    """
    driver.execute_script("toolbar.reset_model_layout();")
    time.sleep(0.3)


def start_stop_sim(driver):
    """Clicks the start simulation start button"""
    play_button = driver.find_element_by_xpath('//*[@id="pause_button"]')
    play_button.click()


def folder_location(var_path, indiv_file=None):

    """Returns a list of the raw text from a python file in var_path

    Example:
    File Structure:
    --nengo_gui/
      --nengo_gui/
             --stuff/
                  --tests/
                      bar.py
                      foo.py

    foo.py:
      print "hello world"
    bar.py:
      print "goodbye world"

    Code:
    files_raw = folder_location('stuff/tests')
    Returns list of ['print "hello world"','print "goodbye world"']
    """

    folder = os.path.dirname(inspect.getfile(nengo_gui))

    test_folder = os.path.join(folder, var_path)

    test_files = os.listdir(test_folder)
    test_files = filter((lambda x: ((x.count(".") == 1) and (".py" in x))), test_files)
    if indiv_file is not None:
        test_files = filter((lambda x: (x == indiv_file)), test_files)
    test_files = map((lambda file_: os.path.join(test_folder, file_)), test_files)
    test_files = map((lambda file_: open(file_, "r").read()), test_files)
    test_files = map((lambda raw_file: raw_file.replace("'", r"\'")), test_files)
    return test_files


def mouse_scroll(driver, scroll_y):

    """scrolls by scroll_y in the netgraph div"""

    element = driver.find_element_by_id("netgraph")
    mouse_x = (element.location["x"] + element.size["width"]) / 2.0
    mouse_y = (element.location["y"] + element.size["height"]) / 2.0
    script = """var netg = document.getElementById("netgraph");
                evt = document.createEvent("Event");
                evt.initEvent("wheel", true, true);
                evt.deltaY = %s;
                evt.clientX = %s;
                evt.clientY = %s ;
                netg.dispatchEvent(evt);"""
    driver.execute_script(script % (scroll_y, mouse_x, mouse_y))
