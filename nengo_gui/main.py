import argparse
import errno
import logging
import os.path
import threading
import webbrowser

import nengo_gui
import nengo_gui.gui
from nengo_gui.guibackend import GuiServerSettings, ModelContext
from nengo_gui.password import gensalt, hashpw, prompt_pw


def old_main():
    print("'nengo_gui' has been renamed to 'nengo'.")
    print("Please run 'nengo' in the future to avoid this message!\n")
    main()


def main():
    try:
        browser_help = 'browser to use (options: "%s")' % '", "'.join(
            webbrowser._tryorder
        )
    except (AttributeError, TypeError):
        # just in case the undocumented webbrowser._tryorder changes
        browser_help = "browser to use (e.g. chrome, firefox)"

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-p",
        "--password",
        dest="password",
        metavar="PASS",
        nargs="?",
        default=False,
        const=True,
        type=str,
        help="password for remote access",
    )
    parser.add_argument(
        "-l",
        "--listen",
        nargs=1,
        default=["localhost"],
        type=str,
        help="Network interface to listen on for incoming connections. Set to "
        "'*' to allow connections on all network interfaces.",
    )
    parser.add_argument(
        "--cert", nargs=1, default=[None], type=str, help="SSL certificate file"
    )
    parser.add_argument("--key", nargs=1, default=[None], type=str, help="SSL key file")
    parser.add_argument(
        "--unsecure", action="store_true", help="do not use SSL security"
    )
    parser.add_argument(
        "-P",
        "--port",
        dest="port",
        metavar="PORT",
        type=int,
        help="port to run server on",
    )
    parser.add_argument("filename", nargs="?", type=str, help="initial file to load")
    parser.add_argument("--debug", action="store_true", help="turn on debug logging")
    parser.add_argument(
        "-b",
        "--backend",
        metavar="BACKEND",
        default="nengo",
        type=str,
        help="default backend to use",
    )
    parser.add_argument(
        "--browser",
        dest="browser",
        type=str,
        metavar="BROWSER",
        default=True,
        help=browser_help,
    )
    parser.add_argument("--no-browser", dest="browser", action="store_false")
    parser.add_argument(
        "--auto-shutdown",
        nargs=1,
        type=float,
        help="Time limit before automatic shutdown. Set to 0 to deactivate.",
        default=[2],
    )
    parser.set_defaults(browser=True)
    args = parser.parse_args()

    if args.debug:
        logging.basicConfig(level=logging.DEBUG)
    else:
        logging.basicConfig()

    if args.port is None:
        port = 8080
    else:
        port = args.port

    if args.password:
        if args.password is True:
            password_hash = hashpw(prompt_pw(), gensalt())
        else:
            password_hash = hashpw(args.password, gensalt())
    else:
        password_hash = None

    host = args.listen[0]
    if host == "*":
        host = ""
    server_settings = GuiServerSettings(
        (host, port),
        args.auto_shutdown[0],
        password_hash=password_hash,
        ssl_cert=args.cert[0],
        ssl_key=args.key[0],
    )
    if host != "localhost" and not server_settings.use_ssl and not args.unsecure:
        raise ValueError(
            "Listening on external network interfaces only allowed with SSL."
        )

    try:
        if args.filename is None:
            filename = os.path.join(nengo_gui.__path__[0], "examples", "default.py")
        else:
            filename = args.filename
        page_settings = nengo_gui.page.PageSettings(backend=args.backend)
        s = None
        while s is None:
            try:
                s = nengo_gui.gui.InteractiveGUI(
                    ModelContext(filename=filename),
                    server_settings,
                    page_settings=page_settings,
                )
            except EnvironmentError as err:
                if args.port is None and err.errno == errno.EADDRINUSE:
                    port += 1
                    if port > 0xFFFF:
                        raise
                    server_settings.listen_addr = (host, port)
                else:
                    raise

        s.server.auto_shutdown = args.auto_shutdown[0]

        if args.browser:
            protocol = "https:" if server_settings.use_ssl else "http:"
            host = "localhost"
            port = s.server.server_port
            if args.browser is True:
                wb = webbrowser.get()
            else:
                try:
                    wb = webbrowser.get(args.browser)
                except webbrowser.Error:
                    try:
                        print(
                            "Known browsers: \n  %s" % "\n  ".join(webbrowser._tryorder)
                        )
                    except (AttributeError, TypeError):
                        # just in case the undocumented webbrowser._tryorder
                        #  changes
                        print("Could not determine the list of known browsers.")
                    raise
            t = threading.Thread(
                target=wb.open,
                args=(
                    "%s//%s:%d%s/?token=%s"
                    % (
                        protocol,
                        host,
                        port,
                        s.server.settings.prefix,
                        s.server.gen_one_time_token(),
                    ),
                ),
            )
            t.start()

        s.start()
    finally:
        logging.shutdown()


if __name__ == "__main__":
    main()
