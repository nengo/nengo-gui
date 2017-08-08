from __future__ import print_function

import binascii
from getpass import getpass
import hashlib
import os

from .exceptions import SessionExpiredError
from .http import HttpRedirect, HttpRequestHandler


def gensalt(size=16):
    return binascii.hexlify(os.urandom(size))


def hashpw(password, salt, algorithm='sha1'):
    h = hashlib.new(algorithm)
    h.update(password)
    h.update(salt)
    return algorithm + ':' + salt + ':' + h.hexdigest()


def checkpw(password, hashed):
    algorithm, salt, _ = hashed.split(':')
    return hashpw(password, salt, algorithm) == hashed


def prompt_pw():
    while True:
        p0 = getpass("Enter password: ")
        p1 = getpass("Enter password: ")
        if p0 == p1:
            return p0
        print("Passwords do not match. Please try again.")


class RequireAuthentication(object):
    def __init__(self, login_route):
        self.login_route = login_route

    def __call__(self, fn):
        def auth_checked(inst):
            session = inst.get_session()
            has_password = inst.server.settings.password_hash is not None
            if has_password and not session.authenticated:
                return HttpRedirect(self.login_route)
            return fn(inst)
        return auth_checked


class AuthenticatedHttpRequestHandler(HttpRequestHandler):

    def get_expected_origins(self):
        session = self.get_session()
        has_password = self.server.settings.password_hash is not None
        origins = []
        if not has_password:
            origins.append('localhost:' + str(self.server.server_port))
            if self.server.server_port in [80, 443]:
                origins.append('localhost')
        elif session.login_host is not None:
            return [session.login_host]
        return origins

    def get_session(self):
        try:
            session_id = self.cookie['_session_id'].value
            session = self.server.sessions[session_id]
        except KeyError:
            session_id, session = self.server.sessions.new_session(
                self.request)
        except SessionExpiredError:
            session_id, session = self.server.sessions.new_session(
                self.request)

        self.cookie['_session_id'] = session_id
        return session

    def checkpw(self):
        session = self.get_session()
        pw = self.db['pw']

        if 'pw' in self.db and checkpw(pw, self.server.settings.password_hash):
            session.authenticated = True
            session.login_host = self.headers.get('host', None)

        return session
