# jobs.py
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Any, Dict

_pool = ThreadPoolExecutor(max_workers=4)

def submit_job(_name: str, func: Callable[..., Any], kwargs: Dict[str, Any]):
    _pool.submit(func, **kwargs)
