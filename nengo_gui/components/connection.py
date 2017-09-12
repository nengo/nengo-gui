import nengo

from .base import Component


class Connection(Component):

    # TODO: would be nice to not have to get namefinder here
    def __init__(self, client, obj, uid, namefinder, pos=None, label=None):
        super(Connection, self).__init__(
            client, obj, uid, pos=pos, label=label)
        self.pre = self._get_pre(self.obj)
        self.post = self._get_post(self.obj)
        self.pre_uid = namefinder[self.pre]
        self.post_uid = namefinder[self.post]

    def create(self):
        # TODO: figure out args to pass to this
        self.client.send("netgraph.create_connection")

    def update(self, other):
        super(Connection, self).update(other)
        if self.pre_uid != other.pre_uid or self.post_uid != other.post_uid:
            self.client.send("%s.reconnect" % self.uid,
                             pre=self.pre_uid, post=self.post_uid)

            # if the connection has changed, tell javascript
            # pres = self.get_parents(
            #     other.pre,
            #     default_labels=new_name_finder.known_name)[:-1]
            # posts = self.get_parents(
            #     other.post,
            #     default_labels=new_name_finder.known_name)[:-1]
            # self.to_be_sent.append(dict(
            #     type='reconnect', uid=uid,
            #     pres=pres, posts=posts))
            # return True

    @staticmethod
    def _get_pre(conn):
        pre = conn.pre_obj
        if isinstance(pre, nengo.ensemble.Neurons):
            pre = pre.ensemble
        return pre

    @staticmethod
    def _get_post(conn):
        post = conn.post_obj
        if isinstance(post, nengo.connection.LearningRule):
            post = post.connection.post_obj
        if isinstance(post, nengo.ensemble.Neurons):
            post = post.ensemble
        return post
