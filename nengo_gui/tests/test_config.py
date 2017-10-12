import os
import shutil

import pytest

from nengo_gui.compat import execfile
from nengo_gui.config import upgrade


def test_upgrade(client, all_examples, tmpdir):
    if not os.path.exists("%s.cfg" % all_examples):
        pytest.skip()

    shutil.copy2(all_examples, str(tmpdir))
    shutil.copy2("%s.cfg" % all_examples, str(tmpdir))

    path = str(tmpdir.join(os.path.basename(all_examples)))
    execfile(path, locals())
    with open("%s.cfg" % path, "r") as fp:
        text = fp.read()
    cfg = upgrade(text, locals=locals())
    assert cfg
