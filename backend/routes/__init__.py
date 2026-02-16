"""Routes package - modular API routers"""
from .auth import router as auth_router
from .demo import router as demo_router

__all__ = ['auth_router', 'demo_router']
