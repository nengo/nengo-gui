# -*- coding: utf-8 -*-

import sys

try:
    import nengo
    import nengo_gui
    import guzzle_sphinx_theme
except ImportError:
    print("To build the documentation, nengo_gui and guzzle_sphinx_theme must "
          "be installed in the current environment. Please install these and "
          "their requirements first. A virtualenv is recommended!")
    sys.exit(1)

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.githubpages',
    'sphinx.ext.intersphinx',
    'sphinx.ext.mathjax',
    'sphinx.ext.todo',
    'sphinx.ext.viewcode',
    'guzzle_sphinx_theme',
    'numpydoc',
]

# -- sphinx.ext.autodoc
autoclass_content = 'both'  # class and __init__ docstrings are concatenated
autodoc_default_flags = ['members']
autodoc_member_order = 'bysource'  # default is alphabetical

# -- sphinx.ext.intersphinx
intersphinx_mapping = {
    "nengo": ("https://www.nengo.ai/nengo/", None)
}

# -- sphinx.ext.todo
todo_include_todos = True

# -- numpydoc config
numpydoc_show_class_members = False

# -- sphinx
exclude_patterns = ['_build']
source_suffix = '.rst'
source_encoding = 'utf-8'
master_doc = 'index'

# Need to include https Mathjax path for sphinx < v1.3
mathjax_path = ("https://cdn.mathjax.org/mathjax/latest/MathJax.js"
                "?config=TeX-AMS-MML_HTMLorMML")

project = u'Nengo GUI'
authors = u'Applied Brain Research'
copyright = nengo.__copyright__
version = '.'.join(nengo_gui.__version__.split('.')[:2])  # Short X.Y version
release = nengo_gui.__version__  # Full version, with tags
pygments_style = 'default'

# -- Options for HTML output --------------------------------------------------

pygments_style = "sphinx"
templates_path = ["_templates"]
html_static_path = ["_static"]

html_theme_path = guzzle_sphinx_theme.html_theme_path()
html_theme = "guzzle_sphinx_theme"

html_theme_options = {
    "project_nav_name": "Nengo GUI %s" % (version,),
    "base_url": "https://www.nengo.ai/nengo_gui",
}

html_title = "Nengo GUI {0} docs".format(release)
htmlhelp_basename = 'Nengo GUI'
html_last_updated_fmt = ''  # Suppress 'Last updated on:' timestamp
html_show_sphinx = False

# -- Options for LaTeX output -------------------------------------------------

latex_elements = {
    'papersize': 'letterpaper',
    'pointsize': '11pt',
    # 'preamble': '',
}

latex_documents = [
    # (source start file, target, title, author, documentclass [howto/manual])
    ('index', 'nengo_gui.tex', html_title, authors, 'manual'),
]

# -- Options for manual page output -------------------------------------------

man_pages = [
    # (source start file, name, description, authors, manual section).
    ('index', 'nengo_gui', html_title, [authors], 1)
]

# -- Options for Texinfo output -----------------------------------------------

texinfo_documents = [
    # (source start file, target, title, author, dir menu entry,
    #  description, category)
    ('index', 'nengo_gui', html_title, authors, 'Nengo GUI',
     'Large-scale neural simulation in Python', 'Miscellaneous'),
]
