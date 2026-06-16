class MuleaError(Exception):
    """Base class for all mulea errors."""


class GmtParseError(MuleaError):
    """Raised when a GMT file cannot be parsed."""
