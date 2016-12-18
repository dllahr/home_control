import logging
import setup_logger
import unittest
import requests
import os.path
import ConfigParser
import json


logger = logging.getLogger(setup_logger.LOGGER_NAME)

config_filepath = os.path.expanduser("~/.test_httpresponse_agent.cfg")

base_url = "https://agent.electricimp.com"
url = None
user_key = None
path = "/control_settings"


class TestHttpResponseAgent(unittest.TestCase):
    def test_this_config_loading(self):
        logger.debug("url:  {}".format(url))
        logger.debug("user_key:  {}".format(user_key))

    def test_no_user_key(self):
        r = requests.get(url)
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(401, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

    def test_invalid_user_key(self):
        headers = {"user-key":"test_httpresponse_agent fake user key"}
        r = requests.get(url, headers=headers)
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(401, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

    def test_invalid_path(self):
        headers = {"user-key":user_key}
        r = requests.get(url + "/test_httpresponse_agent_fake_path", headers=headers)
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(404, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

    def test_invalid_method(self):
        headers = {"user-key":user_key}
        r = requests.post(url + path, headers=headers)
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(404, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

    def test_basic_get(self):
        headers = {"user-key":user_key}
        r = requests.get(url + path, headers=headers)
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(200, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

        rjson = r.json()
        self.assertIn("times", rjson)
        self.assertGreater(len(rjson["times"]), 1)

    def test_put_invalid_json(self):
        headers = {"user-key":user_key, "content-type":"application/json"}
        r = requests.put(url + path, headers=headers, data="test_httpresponse_agent invalid json body")
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(400, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

    def test_put_no_data(self):
        headers = {"user-key":user_key, "content-type":"application/json"}
        data = {"test_httpresponse_agent_test_put_no_data":"placeholder"}
        r = requests.put(url + path, headers=headers, data=json.dumps(data))
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(400, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

    def test_put_mismatch_lengths(self):
        headers = {"user-key":user_key, "content-type":"application/json"}
        data = {"test_httpresponse_agent_test_put_no_data":"placeholder",
            "times":[1, 2], "temperatures":[3, 5, 7]}
        r = requests.put(url + path, headers=headers, data=json.dumps(data))
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(400, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

    def test_basic_put(self):
        headers = {"user-key":user_key, "content-type":"application/json"}
        data = {"test_httpresponse_agent_test_put_no_data":"placeholder",
            "times":[1, 2, 11], "temperatures":[3, 5, 7]}
        r = requests.put(url + path, headers=headers, data=json.dumps(data))
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(200, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

        #test that they were stored on active imp/agent
        headers = {"user-key":user_key}
        r = requests.get(url + path, headers=headers)
        logger.debug("r.status_code:  {}".format(r.status_code))
        self.assertEquals(200, r.status_code)
        logger.debug("r.text:  {}".format(r.text))

        rjson = r.json()
        self.assertIn("times", rjson)
        self.assertEqual(data["times"], rjson["times"])
        self.assertIn("temperatures", rjson)
        self.assertEqual(data["temperatures"], rjson["temperatures"])


if __name__ == "__main__":
    setup_logger.setup(verbose=True)

    cp = ConfigParser.RawConfigParser()
    cp.read(config_filepath)

    url = base_url + "/" + cp.get("general", "agent_url_path")
    user_key = cp.get("general", "user_key")

    unittest.main()
