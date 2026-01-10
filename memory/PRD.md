# StatMoose - Product Requirements Document

## Original Problem Statement
StatMoose is a multi-sport stat tracking application for basketball, football, and baseball. The application allows users to:
- Create and manage teams with rosters
- Track live game statistics for all three sports
- View detailed box scores and play-by-play logs
- Export game data as PDF
- Share live game stats with public viewers
- Manage events/tournaments
- **Multi-tenant school/organization management system**
- **Subscription-based pricing with Stripe integration**

## Latest Updates (January 2026)

### January 10, 2026 - Major UI/UX Updates

#### Navigation Fix - COMPLETED
- **Home Button**: Now goes to `/dashboard` (sport's main page) instead of homepage
- **StatMoose Logo**: Correctly goes to `/` (homepage) 
- This ensures users stay within their sport context when navigating

#### Baseball Field Image - UPDATED
- Replaced SVG-based field with user-provided professional field image
- URL: `https://customer-assets.emergentagent.com/job_baseball-tracker-2/artifacts/xsmgreca_Field.png`
- Position labels (P, C, 1B, 2B, 3B, SS, LF, CF, RF) overlaid on field
- Base runner indicators show when runners are on base

#### Baseball Starter Configuration Dialog - COMPLETED
- **4-Step Wizard** before game starts:
  1. **Home Team Batting Order**: 9 dropdowns (positions 1-9) select from roster
  2. **Home Team Defense**: 9 position dropdowns (P, C, 1B, 2B, 3B, SS, LF, CF, RF)
  3. **Away Team Batting Order**: Same 9 dropdowns for away team
  4. **Away Team Defense**: Same 9 position dropdowns
- Progress bar shows current step
- Players already selected are disabled in other dropdowns
- "Lineups" button in header allows reconfiguring starters
- **Dynamic Field Display**: Shows current fielding team's defensive positions

#### Teams Page Improvements - COMPLETED
- Added **Refresh Button** (🔄) to manually reload teams
- Added visibility change listener to auto-refresh when tab becomes active
- Added console logging for debugging team creation issues
- Fixed data-testid consistency (`create-team-submit`)

### January 10, 2026 - Baseball Game Creation & Persistence COMPLETED

#### Baseball Game Creation UI - FULLY FUNCTIONAL
- **Innings Selector** in New Game page:
  - 7 Innings option (high school/doubleheaders)
  - 9 Innings option (standard regulation) - default
  - Visual buttons with descriptions
- **Game Notes** text input for custom notes
- **Primetime Mode** toggle for video streaming
- **Navigation**: Creating game routes to `/baseball/:gameId`

#### Backend Persistence - COMPLETED
- **Game Creation** (`POST /api/games`):
  - Baseball games initialized with total_innings, current_inning=1, inning_half="top"
  - balls=0, strikes=0, outs=0
  - bases state, inning_scores arrays
  - Player stats embedded in game document
- **Game Updates** (`PUT /api/games/:id`):
  - Auto-saves game state with 1 second debounce
  - Persists balls, strikes, outs, scores, player stats, play-by-play
- **Teams Filtering**: Teams correctly filtered by sport query parameter

#### Test Results: 100% Pass Rate
- 8/8 backend API tests passed
- 7/7 frontend features verified
- Created test file: `/app/tests/test_baseball_features.py`

### January 10, 2026 - Baseball Stat Tracker COMPLETED

#### Baseball "Classic Mode" Stat Tracker - FULLY FUNCTIONAL
- **Live Game UI** (`BaseballLiveGame.jsx`) - Dark theme scoreboard interface:
  - Team names with color-coded backgrounds
  - Live score display
  - Inning indicator (Top/Bottom + inning number)
  - Ball/Strike/Out counters with visual dots
  - Current batter and pitcher info cards
- **Pitch Tracking**:
  - Ball (green button) - adds to ball count
  - Swinging Strike (red button)
  - Looking Strike (red button)
  - Foul Ball - counts as strike (max 2)
  - Intentional Walk
  - Hit By Pitch
  - In Play - opens result dialog
- **In Play Result Dialog**:
  - Hits: Single, Double, Triple, Home Run (green)
  - Outs: Ground Out, Fly Out, Line Out, Pop Out, Strikeout (red)
  - Other: Fielder's Choice, Error, Sacrifice Fly, Sacrifice Bunt, Double Play (gray)
- **Batting Order Panel**:
  - Full lineup with player numbers and names
  - Current batter highlighted
  - Running AB-H stats for each player
- **Realistic Baseball Field Diagram**:
  - Grass mowing pattern stripes
  - **Faded StatMoose logo in centerfield**
  - Warning track around outfield
  - Realistic infield dirt with gradient
  - Chalk base paths and foul lines
  - On-deck circles and coaches boxes
  - Fielding position labels
- **Play-by-Play Log**:
  - Records all pitches and plays
  - Shows inning indicator (1▲ = top, 1▼ = bottom)
- **Demo Mode** (`/demo/baseball`):
  - Uses real BaseballLiveGame.jsx component
  - Mock data from `/api/demo/baseball` endpoint
  - Orange "DEMO MODE" banner
  - 100% test pass rate

#### Routes Added:
- `/baseball/:id` - Live baseball game (protected)
- `/demo/baseball` - Baseball demo mode

### January 10, 2026 - P2 Tasks Completed

#### Stripe Payment Integration - COMPLETED
- **Pricing Page** (`/pricing`) - Displays 4 subscription packages:
  - Basic Monthly ($9.99/mo) - Unlimited teams, basic stats, game history
  - Pro Monthly ($19.99/mo) - Advanced stats, PDF reports, priority support
  - Basic Annual ($99.99/yr) - 17% discount
  - Pro Annual ($199.99/yr) - 17% discount
- **Payment Flow**:
  1. User selects package → Stripe Checkout redirect
  2. Payment transaction recorded in `payment_transactions` collection
  3. On success → Polls status → Updates user subscription
- **Backend Routes**:
  - GET `/api/payments/packages` - List all packages
  - POST `/api/payments/checkout` - Create Stripe checkout session
  - GET `/api/payments/status/{session_id}` - Check payment status
  - GET `/api/payments/my-subscription` - Get user's subscription
  - GET `/api/payments/history` - Get payment history
  - POST `/api/webhook/stripe` - Handle Stripe webhooks
- **Database Collections**:
  - `payment_transactions` - Stores all payment records
  - `users` - Extended with subscription fields (subscription_status, subscription_package, subscription_start, subscription_end)

#### Login Bug Fix - COMPLETED
- **Issue**: Users receiving "Invalid email or password" after deployment
- **Root Cause**: Mismatch between password hashing (passlib) and verification (direct bcrypt)
- **Fix**: Updated `verify_password()` to use `pwd_context.verify()` for robust compatibility

#### Server.py Decomposition - STARTED
- Created `/app/backend/routers/` with modular router files:
  - `payments.py` - Stripe payment integration (INTEGRATED)
  - `auth.py` - Authentication routes (prepared for future integration)
  - `admin.py` - Admin routes (prepared for future integration)
- Documentation added for future router integration

#### FootballLiveGame Refactoring - DOCUMENTED
- Added import for `useDriveState` hook
- Added detailed TODO comments for integration steps
- Hook ready at `/app/frontend/src/hooks/useDriveState.js`
- Refactoring approach documented for safe incremental migration

### January 10, 2026 - Baseball Sport Infrastructure
- **Added Baseball to Sport Selection** - Now displays 3 sports: Basketball, Football, Baseball
- **Baseball Beta Mode Support** - Can enable/disable beta testing mode in admin dashboard
- **Baseball Game Data Model** - Added baseball-specific fields:
  - Game: total_innings (default 9), current_inning, inning_half (top/bottom), outs, balls, strikes, bases (runners), inning_scores
  - Player Stats: Batting (AB, H, 1B, 2B, 3B, HR, R, RBI, BB, K, HBP, SF, SAC, SB, CS), Pitching (IP, H, R, ER, BB, K, HR, pitches, strikes, balls), Fielding (PO, A, E)
- **Baseball Rules Reference**:
  - 3 strikes = strikeout (out)
  - 4 balls = walk
  - 3 outs = end of half inning (teams switch)
  - 9 innings standard (7 for high school/doubleheaders)
  - Top of inning = away team bats, Bottom = home team bats
- **Updated Admin Dashboard** - Added baseball beta toggle with password protection
- **Updated SportContext** - Added BASEBALL to SPORTS enum and SPORT_CONFIG

### January 9, 2026 - Demo Mode Implementation - USING REAL UI COMPONENTS
- **All demos now use the EXACT same UI as signed-in users**
- Modified `LiveGame.jsx`, `AdvancedLiveGame.jsx`, `FootballLiveGame.jsx` to accept `demoMode` and `initialDemoData` props
- Demo wrapper components fetch demo data and pass to real UI components
- Stats work locally in demo mode (no API calls to persist)

- **Basketball Demo** - VERIFIED WORKING (All 3 Modes)
  - **Classic Mode** (`/demo/basketball/classic`) - Uses real `LiveGame.jsx`:
    - Orange "DEMO MODE - Stats will not be saved" bar
    - Fake teams: Northside Tigers vs Eastwood Eagles (10 players each)
    - Full stat tracking (2PT, 3PT, FT, AST, REB, STL, BLK, TO)
    - Make/Miss shot modal with assist attribution
    - Sub In/Out functionality
    - All buttons work: Share, Embed, PDF, CSV, Jumbotron, Note
    - Clock with start/stop and period tracking
    - UNDO button for last action
  - **Advanced Mode** (`/demo/basketball/advanced`) - Uses real `AdvancedLiveGame.jsx`:
    - Possession toggle buttons
    - All action buttons (2PT, 3PT, FT, Steal, Turnover, Foul, Assist, Rebound, Block)
    - Player tables with full stats
    - Recent Plays, Summary, Leaders tabs
    - Clock controls
    - Export and Rosters buttons
  - **Simple Mode** (`/demo/basketball/simple`) - Uses real `LiveGame.jsx` with `simple_mode: true`:
    - Same UI as Classic but shots register immediately without Make/Miss modal

- **Football Demo** (`/demo/football`) - VERIFIED WORKING - Uses real `FootballLiveGame.jsx`:
  - Orange "DEMO MODE" bar
  - Fake teams: Central Wolves vs Riverside Panthers (50 players per team)
  - Kickoff workflow dialog
  - Field visualization with ball position
  - Down & distance tracking
  - All play type buttons (Run, Pass, Punt, Kickoff, Field Goal, Extra PT, Penalty, Timeout)
  - Game controls (Spot Ball, Set Down & Distance, Advance Quarter, End Game)
  - Box Score PDF export
  - Play log with timestamp

- **Homepage Integration** - VERIFIED WORKING
  - "View Demo" buttons on Basketball and Football sport cards
  - Basketball → Demo selector page → Mode selection
  - Football → Direct to Football demo
  - Baseball shows "Coming Soon" badge

- **API Endpoints** - VERIFIED WORKING
  - GET /api/demo/basketball/{mode} - Returns demo game data for classic/advanced/simple
  - GET /api/demo/football - Returns demo football game data

### January 9, 2026 - Security Fix
- **Resend API Key** - MOVED TO ENVIRONMENT VARIABLE
  - Previously hardcoded in server.py (security risk)
  - Now reads from RESEND_API_KEY in backend/.env
  - Contact form email submissions still working correctly

### January 9, 2026 - Homepage Redesign (Sidearm Sports Style)
- **Homepage Redesigned** - COMPLETED
  - Dark theme with black, white, and grey colors (matching Sidearm Sports style)
  - StatMoose logo (logo-white.png) used in navbar and footer
  - Hero section: "This is StatMoose" / "Live Sports Statistics For the Modern Age"
  - Three image sections with uploaded photos:
    - For Schools (Schools.jpg) - Season Tracking, School Dashboard, Team & Season Reports
    - For Broadcasters (Broadcasters.jpg) - Multiple Tracking Modes, Live Stat Outputs, Instant Box Scores
    - For Venues (Venues.jpeg) - Event Management, Ticker & Jumbotron, Game Scheduling
  - Gradient overlays on images with slideshow-style feature navigation
  - Auto-rotating features with manual navigation (arrows + dots)
  - CTA: "Want StatMoose for Your School?" with Contact Us button
  - Get Started button → Contact page (no free trial)

- **Contact Page Updated** - COMPLETED
  - Dark theme matching homepage
  - All form fields: Name, Email, School, State, Role, Message
  - Email submissions stored in database and logged to jaredmoosejones@gmail.com

### January 9, 2026 - Homepage & Contact Page
- **Homepage Created** - COMPLETED
  - Hero section with tagline and CTAs
  - For Schools section: Season Tracking, School Dashboard, Team & Season Reports
  - For Broadcasters section: Multiple Tracking Modes, Live Stat Outputs, Instant Box Scores
  - For Venues section: Event Feature, Ticker & Jumbotron, Scheduling
  - CTA section: "Looking to have StatMoose for your school?"
  - Footer with navigation links
  
- **Contact Page Created** - COMPLETED
  - Contact form with fields: Name, Email, School, State, Role, Message
  - Role options: SID, Athletic Director, Coach, Other
  - State dropdown with all US states
  - Form submissions saved to database
  - Email notification logged (SMTP not configured - submissions stored in DB)
  - Direct email link to jaredmoosejones@gmail.com
  - Success confirmation page after submission

- **Jumbotron Layout Fix** - COMPLETED
  - Player rows now stretch to fill space between title bar and TOTALS bar
  - Uses `justify-evenly` and `flex-1` for even distribution
  - No more cut-off text at bottom

- **Route Updates**
  - Homepage now at `/` (was dashboard)
  - Dashboard moved to `/dashboard`
  - Contact page at `/contact`

### January 9, 2026 - Hooks Refactoring & Jumbotron Updates
- **FootballLiveGame.jsx Hooks Integration** - COMPLETED
  - Integrated `useGameClock` hook for clock state management
  - Integrated `useTimeouts` hook for timeout state management
  - Fixed `queuePlay` initialization order bug using refs
  - Reduced component complexity by extracting state logic to hooks
  - Clock countdown now managed by hook with quarter-end detection
  - Note: `useDriveState` hook available for future integration
  
- **Jumbotron Text Size Verification** - CONFIRMED
  - Broadcast-style design with large, readable text
  - Team names displayed prominently at top
  - Stats table with clear columns and large numbers
  - TOTALS row for team statistics summary

### January 9, 2026 - Priority Features Batch
- **School Creation Beta Mode** - COMPLETED
  - Admin can toggle beta mode requiring password for new school signups
  - Toggle visible in Admin Dashboard under Beta Mode Settings
  - Password input appears when toggle enabled
  - SchoolSignUp.jsx shows beta access dialog when mode is active
  - Password verification via /api/beta-verify endpoint
  
- **Admin Account Deletion** - COMPLETED
  - Admin can delete user accounts from Admin Dashboard
  - Delete button (Trash2 icon) appears in users table for each user
  - Main admin account (antlersportsnetwork@gmail.com) cannot be deleted
  - Confirmation dialog shows user details before deletion
  - DELETE /api/admin/users/{user_id} endpoint with proper auth
  
- **School Exists Check** - VERIFIED WORKING (already implemented)
  - Prevents duplicate school names during registration
  - Case-insensitive name check via /api/schools/check-name/{name}
  - Shows availability status in real-time while typing
  
- **Roster Duplication** - COMPLETED
  - "Duplicate Roster" button in SeasonManagement.jsx Team Roster tab
  - Shows dialog with previous seasons and their rosters
  - Displays: season name, sport emoji, gender/level, player count
  - Preview shows first 6 players when season selected
  - GET /api/schools/{school_id}/rosters endpoint returns all previous rosters

- **Improved Roster Scraping** - COMPLETED
  - Enhanced class/grade extraction in link roster import
  - Supports: FR, SO, JR, SR, GR (college) and grades 7-12 (high school)
  - Recognizes redshirt prefixes (RS FR, RS SO, etc.)
  - Handles many variations: "Freshman", "Fr.", "9th", "Grade 9", etc.
  - Fixed duplicate position text issue (e.g., "GuardGuard" → "Guard")
  - Improved position cleaning (removes height/weight data)
  - Works with PrestoSports, Sidearm, and most athletic department sites

- **Punt/Field Goal Field Views** - COMPLETED
  - Added `PuntFieldView` component with visual punt trajectory arc
  - Shows punt distance, landing spot, and return path on miniature field
  - Added `FieldGoalFieldView` component with goal post visualization
  - Shows FG distance, kick trajectory, and result selection (Good/No Good/Blocked)
  - Both views integrated into FootballLiveGame.jsx punt and FG workflows
  - "Punt Field View" button in punt distance selection step
  - "Punt Return Field View" button in return yards step
  - "Field Goal Field View" button in FG distance step

- **Basketball Jumbotron Redesign** - COMPLETED
  - Completely redesigned `/jumbotron/{shareCode}` page
  - Changed from side-by-side to stacked (top/bottom) team layout
  - Full-screen broadcast-style design with dark blue gradient background
  - Team header with logo, name (large uppercase tracking), timeouts, and fouls
  - Team color accent line separator under each header
  - Stats table: #, PLAYER, PTS, FG, FT, REB, A, PF columns
  - BONUS badge appears when opponent reaches 7+ fouls
  - Auto-refreshes every 2 seconds for live updates
  - Grid pattern overlay for modern broadcast aesthetic

### January 9, 2026 - Gameday Section & UI Improvements
- **Gameday Section** - COMPLETED
  - Shows only when games are scheduled for today
  - Supports multiple games in a single view
  - In-progress games show: score, quarter/period, "LIVE NOW" badge with animation
  - Scheduled games show: matchup, time, location
  - Action buttons: "Live Stats Output" and "Start Game"/"Continue Tracking"
  - Green highlight and border for active games
  
- **In-Progress Game Warning** - COMPLETED
  - Warning dialog when trying to open tracker for active game
  - Shows game matchup and current score
  - Confirmation required before proceeding
  - Prevents accidental conflicts between multiple stat trackers
  
- **Today Button Fixed** - COMPLETED
  - Moved to calendar header next to month/year
  - Navigates to current month AND selects today's date
  - Orange text for visibility

### January 9, 2026 - Major Feature Update
- **Season Creation Enhanced** - COMPLETED
  - Added gender selection (Men's/Women's)
  - Added level selection (Varsity/Sub-Varsity)
  - Backend validation for new fields
  
- **Edit Season Feature** - COMPLETED
  - Edit Season button in Opponents tab
  - Rename season functionality
  - Delete season with password confirmation
  - Warning dialog showing what will be deleted
  
- **School ID Code System** - COMPLETED
  - Auto-generated 3-10 character unique code from school name
  - Displayed in Edit School tab (read-only with copy button)
  - Migration applied to existing schools (e.g., "Moose Academy" → "MOOSEA")
  
- **School Search for Opponents** - COMPLETED
  - "Find School" button in Opponents tab
  - Search by school name or code
  - Shows matching seasons based on sport/gender/level
  - Import school logo, name, color as opponent
  
- **Calendar Game Actions for Final Games** - COMPLETED
  - "View Box Score" button
  - "View Live Stats Output" button  
  - "Reopen Stat Tracker" button (admin only)
  - Shows final score display
  
- **Link Roster Import** - COMPLETED
  - New `/api/team/scrape-roster` endpoint
  - Extracts player number, name, position, and class
  - Works with PrestoSports, Sidearm, and generic table layouts

### Previous Updates
- **Edit Opponent Teams Feature** - COMPLETED
  - Admins can edit opponent name, color, logo, and roster
  - Full dialog workflow with proper text visibility
  - 11/11 backend API tests passing
- **Stats Page** - VERIFIED WORKING
  - Season statistics with team/player averages
  - Schedule tab with game results
- **Refactoring Progress**
  - **useGameClock** and **useTimeouts** hooks now actively integrated into FootballLiveGame.jsx
  - `useDriveState` hook available for future integration
  - Router templates created at /app/backend/routers/ for future server.py refactoring

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
- ✅ **Jumbotron Output Page** - Full-screen presentation view for basketball games
  - Route: `/jumbotron/:shareCode` (public, no auth required)
  - Charcoal background (zinc-800) with two team panels side-by-side
  - Displays: team logos, names, colors, scores, clock time, current period
  - Shows timeout indicators, team fouls, and bonus status
  - Stats table for on-floor players (5 max per team): PTS, FG, FT, REB, A, PF
  - Auto-refresh every 2 seconds for live updates
  - Accessible via "Jumbotron" button in Classic LiveGame header and Advanced LiveGame Export tab

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
- `GET /api/games/{id}/boxscore/pdf` - PDF export (auth required)
- `GET /api/games/{id}/boxscore/public-pdf` - PDF export (public)
- `GET /api/games/{id}/team-comparison/csv` - Live CSV team comparison (public)
- `GET /api/games/share/{share_code}` - Public game data (used by LiveView and Jumbotron)

## Database Schema

### settings collection
```json
{
  "type": "beta_mode",
  "basketball_beta": boolean,
  "basketball_password": string,
  "football_beta": boolean,
  "football_password": string,
  "school_creation_beta": boolean,
  "school_creation_password": string
}
```

### users collection
- user_id, email, username, password_hash, security_questions, auth_provider, school_id, school_role

### schools collection
- school_id, school_code, name, name_lower, state, classification, classification_display, logo_url, invite_code

### seasons collection
- season_id, school_id, name, sport, gender, level, team_id

### teams collection
- id, user_id, school_id, name, color, logo_url, roster[], sport

### games collection
- id, user_id, home_team_id, away_team_id, status, sport, quarter_scores, play_by_play, football_state, season_id

## Prioritized Backlog

### P0 (Completed)
- [x] Test Beta Mode feature end-to-end
- [x] Create custom hooks for football game management
- [x] Admin login verification - **ALL TESTS PASS** (7 backend, 6 frontend)
- [x] Jumbotron Output Page for basketball - **IMPLEMENTED & TESTED**
- [x] **Offline Mode** - Implemented across all stat-tracking modes (Basketball Classic, Advanced, Football)
- [x] **"Halves" Period Option** - Added to game creation, all views updated
- [x] **School/Organization Management Feature** - **COMPLETED January 2026**
  - School signup with unique name validation
  - School admin dashboard with calendar, members table, seasons sidebar
  - Season management with roster, opponents, and game scheduling
  - Invite link system for members to join schools
  - 22 backend API tests passing (100% coverage)
- [x] **School Dashboard Enhancements** - **COMPLETED January 2026**
  - Game note field when scheduling games
  - Player class field (FR/SO/JR/SR/GR) with dropdown
  - Web scraper extracts position and class from roster pages
  - Schedule times in 12-hour format (e.g., 7:00 PM)
  - Opponents filtered by sport in dropdowns
  - Game start dialog with full mode/clock/timeout options
  - Text visibility fixes (white on dark slate background)
- [x] **School Dashboard UI Restructure** - **COMPLETED January 2026**
  - StatMoose logo in header - clicks to sport selection
  - School logo placeholder next to school name
  - Submenu tabs: Schedule, Stats, Members, Edit School
  - Edit School tab: name, state, logo URL, primary color editing
  - Stats tab: season statistics with team/player averages
  - Members tab: team member management moved here
  - Redshirt checkbox (RS) for player registration (RS FR, RS SO, etc.)
- [x] **Edit Opponent Teams Feature** - **COMPLETED January 2026**
  - Edit button on opponent cards in Opponents tab
  - Edit Opponent dialog: name, color picker, logo URL
  - Manage Roster functionality for opponents
  - Backend PUT /api/schools/{school_id}/teams/{team_id} working
  - 11/11 backend tests passing

### P1 (Completed)
- [x] Verify basketball stat tracker improvements - **ALL TESTS PASS**
- [x] Admin login reliability - **VERIFIED WORKING** (both username and email login methods)
- [x] Session logout bug fix - App no longer logs out on transient network errors
- [x] Jumbotron flickering fix
- [x] Text visibility fixes - All dialogs use white/slate-200 text on dark backgrounds

### P2 (Future)
- [ ] Continue refactoring FootballLiveGame.jsx - integrate `useDriveState` hook for drive/possession state
- [ ] Visual test of game recaps on LiveView
- [ ] UI test of CSV roster upload for football
- [ ] Refactor server.py (~5000 lines) into domain-specific routers (ON HOLD per user request)

### P3 (Nice to have)
- [ ] Performance optimizations for large rosters
- [x] Offline mode support - **IMPLEMENTED**
- [ ] Mobile-specific UI improvements

## Testing
- Backend: pytest tests at `/app/tests/test_beta_mode.py`, `/app/tests/test_edit_opponent.py`
- Test reports: `/app/test_reports/iteration_21.json`
- Admin credentials: admin / NoahTheJew1997

## Known Issues
- FootballLiveGame.jsx: Still ~4900 lines; `useGameClock` and `useTimeouts` integrated, `useDriveState` available but not integrated (requires significant refactoring of drive tracking logic - deferred)
- server.py: ~5000 lines, router templates created at /app/backend/routers/ (refactoring ON HOLD)

## Completed Tasks (January 9, 2026)
- Demo Jumbotron working: `/jumbotron/demo-classic`, `/jumbotron/demo-advanced`, `/jumbotron/demo-simple`, `/jumbotron/demo-football`
- Share endpoints return demo data for demo share codes

## Third-Party Integrations
- react-player: Video embedding
- beautifulsoup4/lxml: Web scraping for roster import
- reportlab: PDF generation
- **resend**: Email service for contact form (API key in RESEND_API_KEY env variable)

## School/Organization Feature (January 2026)

### Database Schema Additions
```json
// schools collection
{
  "school_id": "school_xxx",
  "name": "Moose Academy",
  "name_lower": "moose academy",
  "state": "Texas",
  "logo_url": null,
  "invite_code": "Xcgg1Nk_IElbmEC7JO3uNw"
}

// users collection (new fields)
{
  "school_id": "school_xxx",
  "school_role": "admin" | "member"
}

// seasons collection
{
  "season_id": "season_xxx",
  "school_id": "school_xxx",
  "name": "2025-26 Basketball",
  "sport": "basketball",
  "team_id": "team_xxx"
}
```

### API Endpoints
- `POST /api/schools/register` - Create school with admin
- `GET /api/schools/my-school` - Get user's school
- `GET /api/schools/check-name/{name}` - Name availability
- `GET/POST /api/schools/{id}/seasons` - Season management
- `GET/POST /api/schools/{id}/teams` - Team/opponent management
- `POST /api/schools/{id}/seasons/{id}/games` - Schedule games
- `GET /api/schools/{id}/calendar` - Calendar data
- `GET /api/schools/{id}/members` - Member list
- `PUT /api/schools/{id}/members/{id}/role` - Update member role
- `POST /api/schools/{id}/regenerate-invite` - New invite code
- `GET /api/schools/invite/{code}` - Get school by invite
- `POST /api/schools/join/{code}` - Join school

### Frontend Routes
- `/school/signup` - School registration
- `/school-dashboard` - School admin dashboard
- `/school/season/:seasonId` - Season management
- `/school/join/:inviteCode` - Join via invite
