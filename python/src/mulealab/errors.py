class MuleaLabError(Exception):
    """Base class for all muleaLab errors."""


class GmtParseError(MuleaLabError):
    """Raised when a GMT file cannot be parsed."""
