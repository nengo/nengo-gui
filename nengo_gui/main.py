import argparse
import logging
import os.path
import threading
import webbrowser

import nengo_gui
import nengo_gui.gui
from nengo_gui.backend.backend import ModelContext


def old_main():
    print("'nengo_gui' has been renamed to 'nengo'.")
    print("Please run 'nengo' in the future to avoid this message!\n")
    main()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '-p', '--password', dest='password', metavar='PASS',
        help='password for remote access')
    parser.add_argument(
        '-P', '--port', dest='port', metavar='PORT',
        default=8080, type=int, help='port to run server on')
    parser.add_argument(
        'filename', nargs='?', type=str, help='initial file to load')
    parser.add_argument(
        '--debug', action='store_true', help='turn on debug logging')
    parser.add_argument(
        '-b', '--backend', metavar='BACKEND',
        default='nengo', type=str, help='default backend to use')
    parser.add_argument('--browser', dest='browser', action='store_true')
    parser.add_argument('--no-browser', dest='browser', action='store_false')
    parser.add_argument('--auto-shutdown', nargs=1, type=float,
        help="Time limit before automatic shutdown. Set to 0 to deactivate.",
        default=[2])
    parser.set_defaults(browser=True)
    args = parser.parse_args()

    if args.debug:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig()

    try:
        if args.filename is None:
            filename = os.path.join(
                nengo_gui.__path__[0], 'examples', 'default.py')
        else:
            filename = args.filename
        page_settings = nengo_gui.page.PageSettings(backend=args.backend)
        s = nengo_gui.gui.InteractiveGUI(
            ModelContext(filename=filename), page_settings=page_settings,
            port=args.port, password=args.password)
        s.server.auto_shutdown = args.auto_shutdown[0]

        if args.browser:
            threading.Thread(
                target=webbrowser.open,
                args=('http://localhost:%d' % s.server.server_port,)).start()
        s.start()
    finally:
        logging.shutdown()

if __name__ == '__main__':
    main()
