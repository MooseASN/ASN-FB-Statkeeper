# StatMoose API Routers
"""
StatMoose Backend Routers

This package contains modular routers for the StatMoose API:
- auth.py: Authentication, registration, password reset
- admin.py: Admin-only user management and beta settings
- payments.py: Stripe subscription payments
- schools.py: School/organization management
- database.py: Database utilities

Note: Not all routers are currently integrated. The main server.py still
contains all endpoints. These routers are prepared for future modular integration.
"""
