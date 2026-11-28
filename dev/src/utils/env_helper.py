import os
from typing import Iterable, Optional

def get_env_var(keys: Iterable[str], required: bool = False, min_length: Optional[int] = None) -> Optional[str]:
    """Return the first non-empty env var value found from keys (in order).

    Args:
        keys: iterable of candidate env var names, in order of preference.
        required: if True, raise EnvironmentError when none found.
        min_length: if provided, validate length of the found value
            (raise ValueError if too short).

    Returns:
        str or None
    """
    tried = []
    for k in keys:
        tried.append(k)
        v = os.getenv(k)
        if v is not None and v != "":
            if min_length and len(v) < min_length:
                raise ValueError(
                    f"Environment variable {k} is too short ({len(v)} < {min_length})"
                )
            return v

    # Nothing found
    if required:
        raise EnvironmentError(f"None of the environment variables found: {tried}")
    return None