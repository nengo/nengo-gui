import argparse

import nengo_gui

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
    parser.add_argument('--debug', action='store_true',
        help='turn on debug logging')
    parser.add_argument(
        '-b', '--backend', metavar='BACKEND',
        default='nengo', type=str, help='default backend to use')
    args = parser.parse_args()

    if args.debug:
        import logging
        logging.basicConfig(level=logging.DEBUG)

    viz = nengo_gui.Viz(filename=args.filename)
    viz.default_backend = args.backend
    viz.start(port=args.port, password=args.password)

if __name__ == '__main__':
    main()
