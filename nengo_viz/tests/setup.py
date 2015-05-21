"""Script to set up Selenium tests."""

import logging
import os
import struct
import sys
import urllib2
from zipfile import ZipFile

from constants import *


# Chrome Driver
# http://chromedriver.storage.googleapis.com/index.html?path=2.15/
CHROME = "http://chromedriver.storage.googleapis.com/2.15/chromedriver_%s.zip"
CHROME_LINUX32 = CHROME % "linux32"
CHROME_LINUX64 = CHROME % "linux64"
CHROME_MAC = CHROME % "mac32"
CHROME_WIN = CHROME % "win32"
CHROME_ZIP = os.path.join(REQS_PATH, 'chromedriver.zip')

# http://stackoverflow.com/questions/1405913/how-do-i-determine-if-my-python-shell-is-executing-in-32bit-or-64bit-mode-on-os
IS_64_BIT = struct.calcsize("P") * 8 == 64


def download(url, dest, force=False):
    logging.info("Downloading %s -> %s", SS_JAR, dest)
    if os.path.exists(dest):
        if force:
            logging.info("    destination exists, but force enabled")
        else:
            logging.info("    destination exists; skipping")
            return
    page = urllib2.urlopen(url).read()
    with open(dest, 'wb') as f:
        f.write(page)


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    # Put everything into tests/.reqs
    if not os.path.exists(REQS_PATH):
        logging.info("Creating directory: %s", REQS_PATH)
        os.mkdir(REQS_PATH)
    else:
        logging.info("Directory exists: %s", REQS_PATH)

    # Step 1: Download selenium server jar
    download(SS_JAR, SS_NAME)

    # Step 2: Download and unzip chrome driver plugin
    if sys.platform.startswith('win') or sys.platform.startswith('cygwin'):
        logging.info("Assuming Windows platform")
        download(CHROME_WIN, CHROME_ZIP)
    elif sys.platform.startswith('darwin'):
        logging.info("Assuming MacOS platform")
        download(CHROME_MAC, CHROME_ZIP)
    elif sys.platform.startswith('linux'):
        logging.info("Assuming Linux platform (64-bit=%s)", IS_64_BIT)
        download(CHROME_LINUX64 if IS_64_BIT else CHROME_LINUX32, CHROME_ZIP)
    else:
        logging.error("Unrecognized platform: %s", sys.platform)
        sys.exit(-1)

    ZipFile(CHROME_ZIP).extractall(REQS_PATH)