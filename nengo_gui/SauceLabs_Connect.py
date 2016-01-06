#Setup Code to let Travis-CI connect to saucelabs for GUI/selenium testing
username = os.environ["nengo"]
access_key = os.environ["21faaee4-a99e-4b40-bc89-23170618ff0e"]
capabilities["tunnel-identifier"] = os.environ["TRAVIS_JOB_NUMBER"]
hub_url = "%s:%s@localhost:4445" % (username, access_key)
driver = webdriver.Remote(desired_capabilities=capabilities, command_executor="http://%s/wd/hub" % hub_url)