#!/usr/bin/env python
import imp
import io
import os

try:
    from setuptools import setup
except ImportError:
    from ez_setup import use_setuptools
    use_setuptools()

from setuptools import find_packages, setup


def read(*filenames, **kwargs):
    encoding = kwargs.get('encoding', 'utf-8')
    sep = kwargs.get('sep', '\n')
    buf = []
    for filename in filenames:
        with io.open(filename, encoding=encoding) as f:
            buf.append(f.read())
    return sep.join(buf)

root = os.path.dirname(os.path.realpath(__file__))
version_module = imp.load_source(
    'version', os.path.join(root, 'nengo_gui', 'version.py'))
description = "Web-based GUI for building and visualizing Nengo models."
long_description = read('README.rst', 'CHANGES.rst')

setup(
    name="nengo_gui",
    version=version_module.version,
    author="CNRGlab at UWaterloo",
    author_email="celiasmith@uwaterloo.ca",
    packages=find_packages(),
    include_package_data=True,
    entry_points={
        'console_scripts': [
            'nengo_gui = nengo_gui:main',
        ]
    },
    scripts=[],
    url="https://github.com/nengo/nengo_gui",
    license="https://github.com/nengo/nengo_gui/blob/master/LICENSE.md",
    description=description,
    long_description=long_description,
    install_requires=[
        "nengo",
    ],
)
