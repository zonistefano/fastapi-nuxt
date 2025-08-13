from __future__ import annotations

import logging
import logging.config
import os


def configure_logging(
    logger: logging.Logger = logging.getLogger(),
):
    """Configure Python logging given the name of a logging module or file."""
    try:
        logging_conf_dict = LOGGING_CONFIG

        logging.config.dictConfig(logging_conf_dict)
    except Exception as e:
        logger.error(f"Error when setting logging module: {e.__class__.__name__} {e}.")
        raise


class LogFilter(logging.Filter):
    """Subclass of `logging.Filter` used to filter log messages.
    ---

    Filters identify log messages to filter out, so that the logger does not log
    messages containing any of the filters. If any matches are present in a log
    message, the logger will not output the message.

    The environment variable `LOG_FILTERS` can be used to specify filters as a
    comma-separated string, like `LOG_FILTERS="/health, /heartbeat"`. To then
    add the filters to a class instance, the `LogFilter.set_filters()`
    method can produce the set of filters from the environment variable value.
    """

    __slots__ = "name", "nlen", "filters"

    def __init__(
        self,
        name: str = "",
        filters: set[str] | None = None,
    ) -> None:
        """Initialize a filter."""
        self.name = name
        self.nlen = len(name)
        self.filters = filters

    def filter(self, record: logging.LogRecord) -> bool:
        """Determine if the specified record is to be logged.

        Returns True if the record should be logged, or False otherwise.
        """
        if self.filters is None:
            return True
        message = record.getMessage()
        return all(match not in message for match in self.filters)

    @staticmethod
    def set_filters(input_filters: str = "/health-check") -> set[str] | None:
        """Set log message filters.

        Filters identify log messages to filter out, so that the logger does not
        log messages containing any of the filters. The argument to this method
        should be supplied as a comma-separated string. The string will be split
        on commas and converted to a set of strings.

        This method is provided as a `staticmethod`, instead of as part of `__init__`,
        so that it only runs once when setting the `LOG_FILTERS` module-level constant.
        In contrast, the `__init__` method runs each time a logger is instantiated.
        """
        env_filters = os.getenv("LOG_FILTERS", "")
        combined_filters = f"{input_filters},{env_filters}".strip(",")

        if not combined_filters:
            return None

        return {
            filter.strip() for filter in combined_filters.split(",") if filter.strip()
        }


LOG_FILTERS = LogFilter.set_filters()
LOG_FORMAT = str(os.getenv("LOG_FORMAT", "simple")).lower()
# Available log levels debug, info, warning, error, critical
LOG_LEVEL = str(os.getenv("LOG_LEVEL", "info")).upper()
# https://docs.python.org/3/library/logging.config.html
# https://docs.python.org/3/library/logging.html#logrecord-attributes
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "filter_log_message": {"()": LogFilter, "filters": LOG_FILTERS},
    },
    "formatters": {
        "simple": {
            "class": "logging.Formatter",
            "format": "%(levelname)-10s %(message)s",
        },
        "verbose": {
            "class": "logging.Formatter",
            "format": (
                "%(asctime)-30s %(process)-10d %(name)-15s"
                "%(module)-15s %(levelname)-10s %(message)s"
            ),
            "datefmt": "%Y-%m-%d %H:%M:%S %z",
        },
    },
    "handlers": {
        "default": {
            "class": "logging.StreamHandler",
            "filters": ["filter_log_message"],
            "formatter": LOG_FORMAT,
            "level": LOG_LEVEL,
            "stream": "ext://sys.stdout",
        }
    },
    "root": {"handlers": ["default"], "level": LOG_LEVEL},
    "loggers": {
        "fastapi": {"propagate": True},
        "uvicorn": {"propagate": True},
        "uvicorn.access": {"propagate": True},
        "uvicorn.asgi": {"propagate": True},
        "uvicorn.error": {"propagate": True},
    },
}
