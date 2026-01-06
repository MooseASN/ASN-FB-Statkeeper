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
- ✅ Basketball PDF box score formatting (portrait letter page) - **VERIFIED WORKING**
  - Classic Mode: PDF button in header toolbar
  - Advanced Mode: PDF Box Score button in Export tab
  - **LiveView (Public)**: Export PDF button works without authentication
  - All generate valid PDF files with team names, scores, and player statistics
- ✅ **LiveView Team Data** - Team logos and rosters properly displayed
  - API returns `home_team_logo`, `away_team_logo`, `home_team_roster`, `away_team_roster`
  - Shows team logo if available, team initial in styled circle if not
  - **Full roster display**: Box score shows ALL players from both teams' rosters
  - Players without stats show 0 values in all columns
  - Full box score with player statistics displayed correctly
- ✅ **Live CSV Team Comparison** - Real-time CSV output for broadcast software
  - Endpoint: `/api/games/{id}/team-comparison/csv` (public, no auth)
  - 3-row format: Home Team stats | Stat Titles | Away Team stats
  - Columns: FG, 3PT, FT, REBOUNDS, TURNOVERS, LARGEST LEAD
  - CSV Link button in Classic Mode header and Advanced Mode Export tab
- ✅ Basketball Classic Mode: Assist modal, rebound selection flow (Off/Def/Deadball) - **VERIFIED**
  - Assist dialog shows only players ON FLOOR (excluding scorer)
  - "No Assist (Unassisted)" option available
- ✅ Basketball Advanced Mode: Post-miss rebound dialog - **VERIFIED**
- ✅ **Basketball Advanced Mode Enhancements:**
  - Spacebar and backslash (\\) hotkeys to toggle game clock
  - Assist dialog appears after made field goals (shows only players on floor, excludes shooter)
  - Rebound dialog triggers after missed shots AND blocks
  - Auto-flip possession after: made baskets, turnovers, steals, defensive rebounds
  - Team turnover now correctly charges the team with current possession
- ✅ Quick Entry section for players on floor (Classic mode) - **VERIFIED**
- ✅ Auto-save for team information with debouncing
- ✅ Tournament bracket system REMOVED per user request
- ✅ Custom hooks created for football game management (useGameClock, useDriveState, useTimeouts)
- ✅ Football component extraction (FootballField, KickoffDialog, PlayerSelector, YardLineSelector)
- ✅ **Field View Dialog** - Miniature football field visualization for yardage calculation
  - Shows current ball position and allows sliding to set end position
  - Proper NFL/college yardage calculation (50-yard line crossing handled correctly)
  - Available in Run Play, Pass Play (completion), Sack yards, and **Punt Return yards** sections
  - **TOUCHDOWN detection**: Shows TD UI and button when slider reaches opponent's end zone
  - **SAFETY detection**: Shows Safety UI and button when slider reaches own end zone
- ✅ **Clock Initialization Fix** - Football games now use the game's period_duration setting
  - Clock initializes to configured time (e.g., 8:00, 10:00, 12:00) instead of hardcoded 15:00
  - Quarter advancement resets clock to correct period_duration
  - Clock time persists correctly when saving/reloading game state
- ✅ **Football Field Visual Enhancements**
  - Blue Line of Scrimmage (LOS) with label at ball position
  - Yellow First Down Line with "1st" label
  - Sideline hash marks (every yard, longer marks every 5 yards)
  - Field position indicator at bottom of field
- ✅ **Penalty Direction Fix** - Penalties now correctly move ball based on possession
  - Defensive penalties move ball FORWARD (toward defense's goal)
  - Offensive penalties move ball BACKWARD (toward offense's goal)
  - Properly accounts for home team (0→100) vs away team (100→0) direction
- ✅ **Unified Penalty Buttons** - Penalties that can be committed by either team now show as single buttons
  - ★ indicator shows penalties that can be committed by either team
  - Team selection displays correct yardage for each team
  - Unified: Holding, Pass Interference, Illegal Use of Hands
  - Old duplicate entries hidden from search and category lists
- ✅ **Unified Penalty Buttons** - Penalties like Holding and Pass Interference now show as single buttons
  - ★ indicator shows penalties that can be committed by either team
  - Team selection displays correct yardage for each team (e.g., Holding: 10 yds offense, 5 yds + auto 1st defense)
  - Old duplicate entries hidden from search and category lists
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

### P0 (Completed)
- [x] Test Beta Mode feature end-to-end
- [x] Create custom hooks for football game management
- [x] Admin login verification - **ALL TESTS PASS** (7 backend, 6 frontend)

### P1 (Completed)
- [x] Verify basketball stat tracker improvements - **ALL TESTS PASS**
- [x] Admin login reliability - **VERIFIED WORKING** (both username and email login methods)

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
