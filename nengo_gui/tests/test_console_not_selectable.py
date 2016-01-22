from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver import ActionChains
import time
import pytest
from nengo_gui import conftest
from nengo_gui import testing_tools as tt
import os
import sys
import traceback

def test_select_console(driver):
	assert True