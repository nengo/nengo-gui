import argparse

import nengo_gui
import nengo_gui.gui


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
    parser.set_defaults(browser=True)
    args = parser.parse_args()

    if args.debug:
        import logging
        logging.basicConfig(level=logging.DEBUG)

    s = nengo_gui.gui.GUI(filename=args.filename,
                                       backend=args.backend)

    s.start(port=args.port, password=args.password, browser=args.browser)

if __name__ == '__main__':
    main()
