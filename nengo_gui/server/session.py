import hashlib
import logging
import os
import time

from .exceptions import SessionExpiredError

logger = logging.getLogger(__name__)


class Session(object):
    __slots__ = ('creation_time', 'authenticated', 'login_host')

    def __init__(self):
        self.creation_time = time.time()
        self.authenticated = False
        self.login_host = None


class SessionManager(object):
    def __init__(self, time_to_live=60 * 60 * 24 * 30):
        self.time_to_live = time_to_live
        self._sessions = {}

    def __getitem__(self, session_id):
        session = self._sessions.get(session_id, None)
        if (session is None or
                session.creation_time + self.time_to_live < time.time()):
            del self._sessions[session_id]
            raise SessionExpiredError()
        return session

    def __len__(self):
        return len(self._sessions)

    def new_session(self, request):
        session_id = self._new_session_id(request)
        session = Session()
        self._sessions[session_id] = session
        return session_id, session

    def _new_session_id(self, request):
        try:
            peer = request.getpeername()  # not supported on some systems
        except:
            logger.warning(
                "Cannot get peer name. Sessions will not be tied to client.",
                exc_info=True)
            peer = ''

        session_id = hashlib.sha1()
        session_id.update(os.urandom(16))
        for elem in peer:
            if isinstance(elem, str):
                elem = elem.encode('utf-8')
            session_id.update(bytes(elem))
        return session_id.hexdigest()
