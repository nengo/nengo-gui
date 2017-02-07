import argparse
import logging
import os.path
import threading
import webbrowser

import nengo_gui
import nengo_gui.gui
from nengo_gui.guibackend import ModelContext, GuiServerSettings
from nengo_gui.password import gensalt, hashpw, prompt_pw


logger = logging.getLogger(__name__)


def old_main():
    logger.info("'nengo_gui' has been renamed to 'nengo'.")
    logger.info("Please run 'nengo' in the future to avoid this message!\n")
    main()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '-p', '--password', dest='password', metavar='PASS',
        nargs='?', default=False, const=True, type=str,
        help='password for remote access')
    parser.add_argument(
        '--cert', nargs=1, default=[None], type=str,
        help="SSL certificate file")
    parser.add_argument(
        '--key', nargs=1, default=[None], type=str, help="SSL key file")
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

    if args.password:
        if args.password is True:
            password = hashpw(prompt_pw(), gensalt())
        else:
            password = hashpw(args.password, gensalt())
        server_settings = GuiServerSettings(
            ('', 8080), args.auto_shutdown[0], password_hash=password,
            ssl_cert=args.cert[0], ssl_key=args.key[0])
        if not server_settings.use_ssl:
            raise ValueError("Password protection only allowed with SSL.")
    else:
        server_settings = GuiServerSettings(
            ('localhost', 8080), args.auto_shutdown[0], ssl_cert=args.cert[0],
            ssl_key=args.key[0])

    try:
        if args.filename is None:
            filename = os.path.join(
                nengo_gui.__path__[0], 'examples', 'default.py')
        else:
            filename = args.filename
        page_settings = nengo_gui.page.PageSettings(backend=args.backend)
        s = nengo_gui.gui.InteractiveGUI(
            ModelContext(filename=filename), server_settings,
            page_settings=page_settings)
        s.server.auto_shutdown = args.auto_shutdown[0]

        if args.browser:
            protocol = 'https:' if server_settings.use_ssl else 'http:'
            host = 'localhost'
            port = s.server.server_port
            t = threading.Thread(
                target=webbrowser.open,
                args=('%s//%s:%d' % (protocol, host, port),))
            t.start()

        s.start()
    finally:
        logging.shutdown()

if __name__ == '__main__':
    main()
