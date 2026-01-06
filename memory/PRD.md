# StatMoose - Product Requirements Document

## Original Problem Statement
StatMoose is a dual-sport stat tracking application for basketball and football. The application allows users to:
- Create and manage teams with rosters
- Track live game statistics for both sports
- View detailed box scores and play-by-play logs
- Export game data as PDF
- Share live game stats with public viewers
- Manage events/tournaments

## User Personas
1. **Sports Coaches/Managers**: Primary users who track game statistics in real-time
2. **Team Administrators**: Manage team rosters and game schedules
3. **Platform Administrators**: Control access to sports via beta mode, manage users

## Core Requirements

### Authentication & Authorization
- Email/username + password authentication
- Session-based auth with 30-day expiry
- Security questions for account recovery
- Admin-only access for platform management

### Team Management
- Create teams with custom colors and logos
- Manage player rosters (add, edit, remove)
- Import rosters from web URLs or CSV files
- Support for both basketball and football teams

### Game Tracking

#### Basketball
- **Classic Mode**: Manual stat entry with assist prompts, rebound flow (Offensive/Defensive/Deadball)
- **Advanced Mode**: PrestoSports-style interface with post-miss rebound dialog
- Track: Points (FT, 2PT, 3PT), Rebounds (O/D), Assists, Steals, Blocks, Fouls, Turnovers
- Quick Entry section for players on floor
- Clock management with configurable period duration

#### Football
- Track passing, rushing, receiving, defensive stats
- Drive management with down/distance tracking
- Play-by-play logging
- Penalty tracking
- Field visualization

### Admin Features
- **Beta Mode**: Password-protect access to specific sports
- User management and export
- Platform statistics dashboard
- Data migration tools

## What's Been Implemented

### January 2025
- ✅ Beta Mode feature (backend APIs + frontend UI)
- ✅ End Game functionality for both sports
- ✅ Team creation bug fixes (z-index, back button navigation)
- ✅ Basketball PDF box score formatting (portrait letter page)
- ✅ Basketball Classic Mode: Assist modal, rebound selection flow (Off/Def/Deadball)
- ✅ Basketball Advanced Mode: Post-miss rebound dialog
- ✅ Quick Entry section for players on floor (Classic mode)
- ✅ Auto-save for team information with debouncing
- ✅ Tournament bracket system REMOVED per user request
- ✅ Custom hooks created for football game management (useGameClock, useDriveState, useTimeouts)
- ✅ Football component extraction (FootballField, KickoffDialog, PlayerSelector, YardLineSelector)
- ✅ **Field View Dialog** - Miniature football field visualization for yardage calculation
  - Shows current ball position and allows sliding to set end position
  - Proper NFL/college yardage calculation (50-yard line crossing handled correctly)
  - Available in Run Play, Pass Play (completion), and Sack yards sections
  - **TOUCHDOWN detection**: Shows TD UI and button when slider reaches opponent's end zone
  - **SAFETY detection**: Shows Safety UI and button when slider reaches own end zone
- ✅ Game recaps auto-generated on LiveView event ticker (basketball)

## Architecture

### Backend (FastAPI)
- `/app/backend/server.py` - Main server file
- MongoDB database with collections: users, teams, games, events, settings, player_stats

### Frontend (React)
- `/app/frontend/src/pages/` - Main page components
- `/app/frontend/src/components/` - Reusable components
- `/app/frontend/src/components/ui/` - Shadcn UI components
- `/app/frontend/src/components/football/` - Football-specific components
- `/app/frontend/src/hooks/` - Custom React hooks
- `/app/frontend/src/contexts/` - React context providers

## API Endpoints (Key)
- `POST /api/auth/login` - User login
- `GET/PUT /api/admin/beta-settings` - Beta mode management (admin)
- `GET /api/beta-status` - Public beta status check
- `POST /api/beta-verify` - Verify beta password
- `GET/POST /api/teams` - Team management
- `GET/POST /api/games` - Game management
- `PUT /api/games/{id}` - Update game (including End Game)
- `GET /api/games/{id}/boxscore/pdf` - PDF export

## Database Schema

### settings collection
```json
{
  "type": "beta_mode",
  "basketball_beta": boolean,
  "basketball_password": string,
  "football_beta": boolean,
  "football_password": string
}
```

### users collection
- user_id, email, username, password_hash, security_questions, auth_provider

### teams collection
- id, user_id, name, color, logo_url, roster[], sport

### games collection
- id, user_id, home_team_id, away_team_id, status, sport, quarter_scores, play_by_play, football_state

## Prioritized Backlog

### P0 (Completed this session)
- [x] Test Beta Mode feature end-to-end
- [x] Create custom hooks for football game management

### P1 (Next)
- [ ] Verify basketball stat tracker improvements with active game rosters
- [ ] Admin login verification (pending user confirmation after deployment)

### P2 (Future)
- [ ] Further refactor FootballLiveGame.jsx using the new custom hooks
- [ ] Visual test of game recaps on LiveView
- [ ] UI test of CSV roster upload for football

### P3 (Nice to have)
- [ ] Performance optimizations for large rosters
- [ ] Offline mode support
- [ ] Mobile-specific UI improvements

## Testing
- Backend: pytest tests at `/app/tests/test_beta_mode.py`
- Test reports: `/app/test_reports/iteration_1.json`
- Admin credentials: admin / NoahTheJew1997

## Known Issues
- Admin login unreliability: Awaiting user verification after deployment
- FootballLiveGame.jsx: Still large (~4700 lines), needs more refactoring

## Third-Party Integrations
- react-player: Video embedding
- beautifulsoup4/lxml: Web scraping for roster import
- reportlab: PDF generation
- resend: Email service (configured but not fully implemented)
