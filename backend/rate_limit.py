import time
from fastapi import HTTPException, Request

_BUCKET = {}

def rate_limit(max_per_min: int):
    window = 60.0
    def dep(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = f"{ip}:{request.url.path}"
        now = time.time()
        ts = [t for t in _BUCKET.get(key, []) if now - t < window]
        if len(ts) >= max_per_min:
            raise HTTPException(status_code=429, detail="Trop de requêtes, réessaie dans une minute.")
        ts.append(now)
        _BUCKET[key] = ts
    return dep
