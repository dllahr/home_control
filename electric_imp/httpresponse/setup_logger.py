__author__ = "dlahr"


import requests
import unittest
import logging
import setup_logger


LOGGER_NAME = "cmap_logger"

_LOG_FORMAT = "%(levelname)s %(asctime)s %(module)s %(funcName)s %(message)s"
_LOG_FILE_MAX_BYTES = 10000000
_LOG_FILE_BACKUP_COUNT = 5

logger = logging.getLogger(LOGGER_NAME)


def setup(verbose=False, log_file=None):
    level = (logging.DEBUG if verbose else logging.INFO)

    if log_file is None:
        logging.basicConfig(level=level, format=_LOG_FORMAT)
    else:
        logger.setLevel(level)
        handler = logging.handlers.RotatingFileHandler(log_file, maxBytes=_LOG_FILE_MAX_BYTES,
                                                       backupCount=_LOG_FILE_BACKUP_COUNT)
        handler.setFormatter(logging.Formatter(fmt=_LOG_FORMAT))
        logger.addHandler(handler)
