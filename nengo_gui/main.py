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
    args = parser.parse_args()

    viz = nengo_gui.Viz(filename=args.filename)
    viz.start(port=args.port, password=args.password)

if __name__ == '__main__':
    main()
