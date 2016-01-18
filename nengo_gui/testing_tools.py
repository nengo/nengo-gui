import os
import inspect
import nengo_gui
import pytest
import time

#-------------------
#update_editor(driver,nengoCode) takes in a selenium webdriver instance
#and a string of python nengo code, then inserts the code into ace editor
#and waits for the page to update.
def update_editor(driver,nengoCode):
    nengoCode = nengoCode.replace("\n","\\n").replace("\r","\\r")
    js = "var editor = ace.edit('editor');editor.setValue('"+nengoCode+"');"
    driver.execute_script(js)
    time.sleep(1)
#Example:
#driver = webdriver.firefox()
#driver.get(localhost:8080/)
#code_string = "print hello world"
#update_editor(driver,code_string)
#Ace editor will update with "print hello world"

#-------------------
#reset_page takes in a selenium webdriver instance, then clicks 
#the reset page button on nengo_gui
#and waits for the page to reset.
def reset_page(driver):
    reset = driver.find_element_by_xpath('//*[@id="Reset_layout_button"]')
    reset.click()
    time.sleep(0.5)
    reset_acc = driver.find_element_by_xpath('//*[@id="confirm_reset_button"]')
    reset_acc.click()
    time.sleep(0.2)
#Example:
#driver = webdriver.firefox()
#driver.get(localhost:8080/)
#reset_page(driver)
#The page then resets

#-------------------
#start_stop_sim takes in a selenium webdriver instance, then clicks 
#the start button. If the simulation is not running it starts it
#if its currently running it stops it.

def start_stop_sim(driver):
    play_button = driver.find_element_by_xpath('//*[@id="pause_button"]')
    play_button.click()

#Example:
#driver = webdriver.firefox()
#driver.get(localhost:8080/)
#start_stop_sim(driver)
#The simulation starts running.

#-------------------
#folder_location takes in a string which represents a path relative
#from the nengo_gui/nengo_gui folder. It then returns a list of the raw
#text from any python file in that folder

def folder_location(var_path):
    folder = os.path.dirname(inspect.getfile(nengo_gui))

    test_folder = os.path.join(folder,var_path)

    test_files = os.listdir(test_folder)
    test_files = filter((lambda x: ((x.count('.') == 1) and ('.py' in x))),
        test_files)
    test_files = map((lambda file_: os.path.join(test_folder,file_)),
        test_files)
    test_files = map((lambda file_: open(file_,'r').read()),
        test_files)
    test_files = map((lambda raw_file: raw_file.replace("'",r"\'")),
        test_files)
    return test_files

#Example:
#File Structure:
#--nengo_gui/
#   --nengo_gui/
#          --stuff/
#               --tests/
#                   bar.py
#                   foo.py
#                   
#foo.py:
#   print "hello world"
#bar.py:
#   print "goodbye world"
#
#Code:
#files_raw = folder_location('stuff/tests')
#Returns list of ['print "hello world"','print "goodbye world"']

#mouse_scroll takes in a vertical scroll amount and scrolls appropriatley from
#the center of netgraph after that
def mouse_scroll(driver,scroll_y):
    element = driver.find_element_by_id('netgraph')
    mouse_x = (element.location['x']+element.size['width'])/2.0
    mouse_y = (element.location['y']+element.size['height'])/2.0
    script = '''var netg = document.getElementById("netgraph");
evt = document.createEvent("Event");
evt.initEvent("mousewheel", true, true);
evt.deltaY = %s;
evt.clientX = %s;
evt.clientY = %s ;
netg.dispatchEvent(evt);console.log("execute");'''
    driver.execute_script(script % (scroll_y,mouse_x,mouse_y))