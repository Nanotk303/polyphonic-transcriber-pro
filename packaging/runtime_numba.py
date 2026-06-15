import os
import tempfile

os.environ["NUMBA_CACHE_DIR"] = os.path.join(tempfile.gettempdir(), "polyphonic-transcriber-numba")
import numba

_jit = numba.jit
_guvectorize = numba.guvectorize
_vectorize = numba.vectorize


def _without_cache(decorator):
    def wrapper(*args, **kwargs):
        kwargs["cache"] = False
        return decorator(*args, **kwargs)

    return wrapper


numba.jit = _without_cache(_jit)
numba.guvectorize = _without_cache(_guvectorize)
numba.vectorize = _without_cache(_vectorize)
