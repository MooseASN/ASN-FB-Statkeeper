"""Routes package - modular API routers"""
from .auth import router as auth_router
from .demo import router as demo_router
from .teams import router as teams_router
from .jumbotron import router as jumbotron_router
from .events import router as events_router
from .sponsors import router as sponsors_router

__all__ = [
    'auth_router', 
    'demo_router', 
    'teams_router', 
    'jumbotron_router',
    'events_router',
    'sponsors_router'
]
