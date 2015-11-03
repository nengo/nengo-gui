"""Nengo GUI version information.

We use semantic versioning (see http://semver.org/).
Additionally, '-dev' will be added to the version unless the code base
represents a release version. Commits for which the version doesn't have
'-dev' should be git tagged with the version.
"""

name = "nengo_gui"
version_info = (0, 1, 5)  # (major, minor, patch)
dev = False

version = "{v}{dev}".format(v='.'.join(str(v) for v in version_info),
                            dev='-dev' if dev else '')
