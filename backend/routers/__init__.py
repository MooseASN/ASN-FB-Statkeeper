# StatMoose API Routers
"""
StatMoose Backend Routers

This package contains modular routers for the StatMoose API.

CURRENTLY ACTIVE ROUTERS (included in server.py):
- payments.py: Stripe subscription payments, tier changes, billing portal
- support_chat.py: AI-powered support chatbot
- error_logging.py: Client-side error logging

PLANNED DECOMPOSITION (server.py -> routers):
The main server.py (~7800 lines) should be gradually decomposed into:

1. auth.py (PARTIALLY EXISTS)
   - /api/auth/login, /api/auth/register
   - /api/auth/me, /api/auth/logout  
   - /api/auth/forgot-password, /api/auth/reset-password
   - Security questions endpoints
   Lines: ~300

2. teams.py (TO CREATE)
   - /api/teams CRUD
   - /api/teams/{id}/roster/* 
   - /api/teams/{id}/logo/upload
   - CSV/MaxPreps roster imports
   Lines: ~500

3. games.py (TO CREATE)
   - /api/games CRUD
   - /api/games/{id}/stats
   - /api/games/{id}/live-stats
   - /api/games/{id}/play-by-play
   - Sport-specific stat recording
   Lines: ~2000

4. admin.py (PARTIALLY EXISTS)
   - /api/admin/* endpoints
   - User management
   - Beta feature settings
   - Pricing configuration
   Lines: ~800

5. schools.py (PARTIALLY EXISTS)
   - /api/schools/* endpoints
   - Organization/school management
   - Season management
   Lines: ~600

6. exports.py (TO CREATE)
   - /api/games/{id}/pdf
   - /api/games/{id}/csv
   - /api/teams/{id}/stats/csv
   Lines: ~400

7. public.py (TO CREATE)
   - /api/live/{share_token}
   - /api/embed/{share_token}
   - Public game viewing
   Lines: ~300

8. events.py (TO CREATE)
   - /api/events/* 
   - Tournament management
   Lines: ~400

MIGRATION STRATEGY:
1. Create router file with proper models and helpers
2. Move one endpoint group at a time
3. Test thoroughly after each migration
4. Update imports and remove from server.py
5. Run full regression tests

NOTE: Decomposition should be done incrementally to avoid breaking changes.
The monolithic server.py works - prioritize stability over refactoring.
"""
