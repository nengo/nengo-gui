import os

# Download directory for Selenium server and plugins
REQS_PATH = os.path.join(os.path.dirname(__file__), '.reqs')

# Selenium Server
# http://www.seleniumhq.org/download/
SS_JAR = "http://selenium-release.storage.googleapis.com/2.45/selenium-server-standalone-2.45.0.jar"
SS_NAME = os.path.join(REQS_PATH, os.path.basename(SS_JAR))