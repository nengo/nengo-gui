#!/usr/bin/env python
import imp
import sys
import os

try:
    from setuptools import setup
except ImportError:
    from ez_setup import use_setuptools
    use_setuptools()

from setuptools import find_packages, setup

root = os.path.dirname(os.path.realpath(__file__))
description = "Web-based GUI for building and visualizing Nengo models."
with open(os.path.join(root, 'README.md')) as readme:
    long_description = readme.read()

setup(
    name="nengo_viz",
    version=0.1,
    author="CNRGlab at UWaterloo",
    author_email="celiasmith@uwaterloo.ca",
    packages=find_packages(),
    include_package_data=True,
    scripts=[],
    url="https://github.com/ctn-waterloo/nengo_viz",
    license="https://github.com/ctn-waterloo/nengo_viz/blob/master/LICENSE.md",
    description=description,
    requires=[
        "nengo",
    ],
)
