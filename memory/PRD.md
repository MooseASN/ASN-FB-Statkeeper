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
- **Shared access - allow multiple users to manage the same teams/games**

## Latest Updates (January 2026)

### January 11, 2026 - P1/P2/P3 FEATURES COMPLETE ✅

**P1: Trial Periods for Premium Tiers**
- Added 14-day free trial for Silver and Gold tiers (monthly and annual)
- Bronze tier remains free with no trial
- Updated Stripe checkout to use subscription mode with `trial_period_days`
- Pricing page now shows "14-day free trial" text and "Start Free Trial" buttons

**P1: Embeddable Live Stats Snippet**
- Created `/app/frontend/src/components/EmbedSnippetGenerator.jsx` component
- Generates iframe code, responsive embed with auto-resize, and link button
- Integrated into BaseballLiveGame with "Embed" button in header
- Supports all sports with configurable size presets

**P2: Season Clone Feature**
- Added `POST /api/schools/{school_id}/seasons/{season_id}/clone` endpoint
- Options to clone roster and/or game schedule
- Returns new season_id and clone statistics

**P3: Redo Button**
- Enhanced `useGameHistory` hook with redo support (`canRedo`, `redoLastState`)
- Added Redo button to Basketball LiveGame (green button, appears after undo)
- Added Redo button to BaseballLiveGame (with count display)

**Files Modified:**
- `/app/backend/routers/payments.py` (trial_days, subscription mode)
- `/app/backend/server.py` (SeasonCloneRequest, clone endpoint)
- `/app/frontend/src/components/EmbedSnippetGenerator.jsx` (NEW)
- `/app/frontend/src/hooks/useGameHistory.js` (redo support)
- `/app/frontend/src/pages/LiveGame.jsx` (redo functionality)
- `/app/frontend/src/pages/BaseballLiveGame.jsx` (redo, embed)
- `/app/frontend/src/pages/PricingPage.jsx` (trial text)

**Testing:** 11/11 backend tests passed (100%)

---

### January 11, 2026 - ADMIN DASHBOARD RBAC & USER MANAGEMENT ✅

**New Features: Role-Based Access Control, User Management, and Pricing Management**

#### 1. Role-Based Access Control (RBAC) ✅
- Replaced hardcoded admin email checks with proper role-based system
- User roles: `primary_admin`, `admin`, `user`
- Primary admins (hardcoded emails) always have access
- Regular admin role can be granted/revoked by primary admins
- All admin endpoints now check role field in database

#### 2. Admin Dashboard - User Management ✅
Updated `/app/frontend/src/pages/AdminDashboard.jsx`:
- **New Columns**: Role, Tier, Subscription status
- **Role Badges**: Primary Admin (amber/crown), Admin (purple/shield), User (gray)
- **Tier Badges**: 🥇 Gold, 🥈 Silver, 🥉 Bronze with appropriate colors
- **Subscription Status**: Shows Active/Free with expiration dates
- **Grant/Revoke Admin**: UserCog button opens confirmation dialog

#### 3. Admin Dashboard - Pricing Management ✅
New collapsible "Pricing Management" section:
- Displays Bronze, Silver, Gold tier cards
- Shows monthly and annual prices
- Lists features for each tier
- "Edit Pricing" button enables edit mode
- Editable price inputs and feature lists
- Save/Cancel buttons for changes

#### 4. New API Endpoints:
- `GET /api/admin/pricing` - Returns pricing configuration
- `PUT /api/admin/pricing` - Updates pricing (primary admin only)
- `PUT /api/admin/users/{user_id}/role` - Grant/revoke admin (primary admin only)

#### 5. Updated API Response:
`GET /api/admin/users` now returns:
- `effective_role`: 'primary_admin' | 'admin' | 'user'
- `subscription_tier`: 'bronze' | 'silver' | 'gold'
- `subscription_status`: 'active' | 'none'
- `subscription_end`: ISO date string (if active)

**Files Modified:**
- `/app/backend/server.py` (Lines 712-1010: RBAC functions, pricing endpoints, user role endpoint)
- `/app/frontend/src/pages/AdminDashboard.jsx` (New sections, updated table)

**Testing:** 21/21 tests passed (100% success rate)
- Test file: `/app/tests/test_admin_dashboard_features.py`
- Test report: `/app/test_reports/iteration_41.json`

---

### January 11, 2026 - PRICING PAGE & SUBSCRIPTION TIERS ✅

**New Feature: Complete pricing page with 3 subscription tiers**

#### Tiers:
| Feature | 🥉 Bronze (Free) | 🥈 Silver ($15/mo) | 🥇 Gold ($20/mo) |
|---------|------------------|-------------------|------------------|
| Teams & Games | Unlimited | Unlimited | Unlimited |
| Game History | Unlimited | Unlimited | Unlimited |
| PDF Box Scores | ✅ | ✅ | ✅ |
| Stat Tracking Modes | Simple + Advanced | Simple + Advanced | Simple + Advanced |
| Play-by-Play Logging | ✅ | ✅ | ✅ |
| Public Live Stats Pages | ❌ | ✅ | ✅ |
| Embed Widgets | ❌ | ✅ | ✅ |
| Sponsor Banners | ❌ | 5 slots | Unlimited |
| Season Stats & Leaderboards | ❌ | ✅ | ✅ |
| CSV Export | ❌ | ✅ | ✅ |
| Shared Access (Invite Staff) | ❌ | ❌ | ✅ |
| Custom Branding (Live Stats) | ❌ | ❌ | ✅ |
| White-Label Embeds | ❌ | ❌ | ✅ |
| Custom Team Logos | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

#### Implementation:
- **Frontend:** `/app/frontend/src/pages/PricingPage.jsx`
  - Table format with tier logos above each column
  - Feature comparison with checkmarks/X marks
  - "MOST POPULAR" badge on Gold tier
  - Subscribe buttons connected to Stripe checkout
  
- **Backend:** `/app/backend/routers/payments.py`
  - `GET /api/payments/packages` - Returns all subscription packages
  - `GET /api/payments/tier-features/{tier}` - Returns feature flags for a tier
  - `POST /api/payments/checkout` - Creates Stripe checkout session
  - `GET /api/payments/my-subscription` - Returns user's current tier
  - Bronze tier (free) skips Stripe checkout

**Testing:** 100% success rate (14/14 features, 12/12 API tests)

---

### January 11, 2026 - BASEBALL DASHBOARD FIX ✅

**Bug Fix:** Baseball live games on dashboard now show correct inning format

- Changed "Q1" to "Top 1" / "Bot 3" for baseball games
- Fixed game routing to /baseball/{id} instead of /game/{id}
- Fixed score calculation to use home_score/away_score for baseball

---

### January 10, 2026 - BASEBALL LIVE STATS OUTPUT ✅

**New Feature: Public, shareable live stats page for baseball games**

Similar to MLB GameDay, StatBroadcast, PrestoSports, and Sidearm Sports.

#### Route: `/baseball/{id}/stats`
- Public access (no authentication required)
- Auto-refreshes every 5 seconds for live updates

#### Features:
- **Scoreboard**: Team logos, names, colors, and scores
- **Game Status**: Inning indicator (▲/▼) with LIVE badge for active games
- **Diamond Visualization**: SVG base runner display
- **Ball-Strike-Out Count**: Visual indicators below diamond
- **Linescore**: Inning-by-inning scores with R/H/E totals
- **Box Score Tab**: Batting stats (AB, R, H, RBI, BB, K) and Pitching stats (IP, H, R, ER, BB, K, NP)
- **Play-by-Play Tab**: Event log grouped by inning

#### Access Points:
- Direct URL: `/baseball/{gameId}/stats`
- From BaseballLiveGame: "Share" button copies URL, "Live Stats" button opens in new tab

**Files Created/Modified:**
- `/app/frontend/src/pages/BaseballLiveStats.jsx` (NEW)
- `/app/frontend/src/pages/BaseballLiveGame.jsx` (Updated Share + Live Stats buttons)
- `/app/frontend/src/App.js` (Route added)
- `/app/backend/server.py` (Public endpoint enhanced for baseball)

**Testing:** 100% success rate (13/13 features verified)

---

### January 10, 2026 - SITE-WIDE BETA MODE ✅

**New Feature: Admin can lock down the entire site to authorized users only**

#### Backend Endpoints:
- `GET /api/site-beta-status` - Public endpoint to check if site is in beta mode
- `GET /api/check-beta-access` - Auth required, checks if current user has beta access
- `GET /api/admin/beta-settings` - Admin only, get all beta settings
- `PUT /api/admin/beta-settings` - Admin only, update beta settings

#### Frontend Components:
- **AdminDashboard.jsx** - Added Site-Wide Beta Mode toggle section with:
  - Enable/disable toggle with amber highlight when active
  - Custom message input for blocked users
  - Email whitelist management (add/remove emails)
- **BetaAccessRequired.jsx** - New page shown to blocked users with:
  - Dark gradient background with StatMoose logo
  - Lock icon and "Private Beta" message
  - "Check Again" and "Sign Out" buttons
- **App.js** - Added beta access checking after login

#### Access Control Rules:
1. Admin users ALWAYS have access (bypass beta mode)
2. Whitelisted emails have access when beta is enabled
3. All other logged-in users see BetaAccessRequired page
4. Demo pages (/demo/*) and public pages remain accessible

**Testing:** 9/9 backend tests passed, 100% frontend success

---

### January 10, 2026 - NEW FEATURES (Session 2) ✅

#### 1. Add Player to Roster Feature ✅
When a user enters a player number not in the roster during stat tracking:
- Shows "Player Not Found" warning in amber
- Prompts "Add #XX to [Team Name]?"
- Input field for player name
- "Cancel" and "Add & Select" buttons
- Player is added to the game roster and selected for the current play
- Toast notification confirms the addition

#### 2. Optional Game Clock in Simple Football Mode ✅
- Clock can now be hidden with X button next to controls
- When hidden, shows "Enable Clock" button with clock icon
- Quarter controls remain visible when clock is hidden
- Clock state persists during the game session

#### 3. New LoadingScreen Component ✅
- Dark gradient background (from-zinc-900 via-black to-zinc-800)
- White StatMoose logo with moose antler SVG
- Thin spinning circle animation around the logo
- Optional loading message text
- Used across all major game pages:
  - SimpleFootballLiveGame.jsx
  - FootballLiveGame.jsx
  - BaseballLiveGame.jsx
  - AdvancedLiveGame.jsx

#### 4. Game Creation Bug Fixed ✅
- Backend: Baseball-specific fields now have proper defaults for all sports
- No more "Failed to Start Game" errors
- All sports (basketball, football, baseball) create games successfully

**Testing:** 6/6 features passed (100% success rate)

---

### January 10, 2026 - SIMPLE FOOTBALL MODE ENHANCEMENTS ✅

#### P0 Features Completed:

**1. Back Button Navigation Fix ✅**
- NewGame.jsx back button now navigates to /dashboard instead of home page
- Works for all sports (basketball, football, baseball)

**2. Simple Football UI Styling Updates ✅**
- Scoring buttons (TD, XP, 2PT, FG, Safety): Dark grey background with white outline, larger text (text-3xl)
- Stat buttons color-coded:
  - Rush Yards: Emerald green (bg-emerald-700)
  - Pass Yards: Blue (bg-blue-700)
  - 1st Down: Amber (bg-amber-700)
  - Turnover: Red (bg-red-700)
  - Penalty: Orange (bg-orange-700)

**3. Clock Controls Enhanced ✅**
- Replaced ±10 second buttons with: +1s, -1s, +1m, -1m
- Enlarged play/pause button (h-10 w-10)
- Shows keyboard shortcut hint in header: "(Space/\ = Clock)"

**4. Quarter/Game Flow Logic ✅**
- End of Q2: Prompt with "Go to Halftime" or "Start 3rd Quarter"
- After halftime: Browser confirm to reset timeouts
- End of Q4: Prompt with "End Game (Final)" or "Start 1st Overtime"
- All quarter advances require user confirmation
- Game status states: 'in_progress', 'Halftime', 'Final'

**5. Enhanced Turnover Workflows ✅**
- **Interception**: Step 1 (Select type) → Step 2 (Who threw it - offense) → Step 3 (Who intercepted - defense)
- **Fumble**: Step 1 (Select type) → Step 2 (Who fumbled - offense) → Step 3 (Who recovered - can be either team)
- **Turnover on Downs**: One-click, no player selection needed

**6. Keyboard Shortcuts ✅**
- Spacebar: Toggle clock start/stop (both Simple and Advanced modes)
- Backslash (\): Toggle clock start/stop (both Simple and Advanced modes)
- Added to both SimpleFootballLiveGame.jsx and FootballLiveGame.jsx
- Help dialog in Advanced mode updated to show both shortcuts

#### P1 Features Completed:

**7. Football Stat Mode Selector on Game Creation ✅**
- NewGame.jsx shows Simple vs Advanced mode selector for football
- Simple mode: Orange border when selected, shows feature list
- Advanced mode: Green border when selected (default), shows feature list
- Navigation routes:
  - Simple mode → `/football/{id}/simple`
  - Advanced mode → `/football/{id}`

**Backend Fix Applied:**
- server.py lines 2371-2378: Baseball-specific fields now have proper defaults (not None) for all sports
- Fixes Pydantic validation error when creating football/basketball games

**Testing:** 14/14 features passed (100% success rate)

### January 2026 - SIMPLE FOOTBALL STAT-TRACKING MODE v2 ✅

#### SimpleFootballLiveGame.jsx - REDESIGNED ✅
Broadcaster-friendly interface with structured stat collection workflows:

**Workflow Details:**
| Workflow | Steps |
|----------|-------|
| **Rush** | Click Rush → Type player # → Enter yards → Select tackler (or No Tackle) |
| **Pass** | Select QB (with Remember Me checkbox) → Enter yards → Select receiver → Select tackler |
| **Field Goal** | Select kicker → Choose distance (20-55 yds) → Good (+3) or No Good (change possession) |
| **Penalty** | Select team → Type-to-search penalty dropdown → Forward/Backward yards |
| **Turnover** | Fumble / Interception / Turnover on Downs → Auto possession change |
| **First Down** | One-click adds 1st down to team with possession |

**Key Features:**
- **No scrolling required** - entire UI fits on screen
- **QB "Remember Me"** - checkbox to persist QB selection per team
- **Type-to-search player input** - shows matching players as you type
- **Type-to-search penalties** - 22 common penalties with default yards
- **Individual player stats** - tracks rush yards, pass yards, receiving yards, tackles
- **Compact stats panel** - horizontal grid showing Rush/Pass/Total/TO/1st

**Routes:**
- Demo: `/demo/football/simple`
- Authenticated: `/football/:id/simple`

**Testing:** 11/11 features passed (100% success rate)

### January 2026 - CUSTOM HOOKS INTEGRATION ✅

#### BaseballLiveGame.jsx Refactoring - COMPLETED ✅
Integrated custom hooks to manage game state:
- `useGameHistory` - Undo/redo state management with `saveStateForUndo`, `popLastState`, `canUndo`
- `usePlayByPlay` - Play-by-play log with `addPlay`, `removeLastPlay`, `setPlays`
- Removed redundant useState declarations and useRef for play deduplication
- Current: 2482 lines (reduced from 2513)

#### FootballLiveGame.jsx Refactoring - COMPLETED ✅
Integrated `useDriveState` hook for drive tracking:
- Now using destructured state from hook: `possession`, `ballPosition`, `down`, `distance`, `quarter`
- Drive management: `currentDrive`, `allDrives`, `homeTimeOfPossession`, `awayTimeOfPossession`
- Helper functions: `advanceDown`, `changePossession`, `flipPossession`, `spotBall`, `getYardLineDisplay`
- Current: 5023 lines (reduced from 5039)

#### New Custom Hooks Created
| Hook | Lines | Purpose |
|------|-------|---------|
| `useBaseballGameState.js` | 322 | Baseball game state management |
| `useFootballGameState.js` | 274 | Football game state management |
| `useFootballPlayWorkflow.js` | 222 | Play workflow state for football |
| `useDriveState.js` | 233 | Drive tracking for football |
| `useBaseRunners.js` | 194 | Base runner management |
| `usePlayerStats.js` | 116 | Player stat updates |
| `usePlayByPlay.js` | 78 | Play-by-play log management |
| `useGameHistory.js` | 64 | Undo/redo functionality |

### January 2026 - TEAM LOGO UPLOAD, BASEBALL IN SCHOOLS, ADMIN SHARED ACCESS ✅

#### Team Logo Upload - COMPLETED ✅
- **Endpoint**: `POST /api/teams/{team_id}/logo/upload`
- Accepts PNG, JPG, GIF, WEBP images up to 5MB
- Stores logos as base64 data URLs
- TeamDetail.jsx has new logo upload UI with:
  - Upload Image button
  - Logo preview (80x80)
  - Remove logo button
  - Fallback URL input

#### Baseball Integration in Schools Dashboard - COMPLETED ✅
- Baseball (⚾) added as sport option when creating seasons
- Baseball games navigate to `/baseball/:id` route
- Clock settings show "N/A - Innings Based" for baseball
- Timeout section shows "No timeouts in baseball - use mound visits"
- Sport emoji: basketball 🏀, football 🏈, baseball ⚾

#### Admin Shared Access System - COMPLETED ✅
Allows users to share their teams, games, and events with other StatMoose users.

**Backend Endpoints**:
- `GET /api/admin/shared-access` - List users you've granted access to
- `GET /api/admin/shared-access/received` - List accounts you have access to  
- `POST /api/admin/shared-access` - Grant access by email
- `DELETE /api/admin/shared-access/{id}` - Revoke access

**Data Flow**:
- Teams/Games/Events queries include both owned AND shared data
- Shared items have `is_shared: true` and `shared_from_user_id` fields

**Frontend UI** (AccountSettings.jsx):
- Grant Access section with email input
- "Users with Access to My Data" list with revoke buttons
- "Accounts I Have Access To" list

### January 2026 - WEB & PDF BOX SCORE ✅

#### Web Box Score Page - COMPLETED ✅
New page at `/baseball/:id/boxscore` and `/demo/baseball/boxscore`:
- **Header**: Game date, location, final score with team colors
- **Score by Innings table**: All innings (1-9+) with R, H, E totals
- **Scoring Summary**: Play-by-play of scoring plays only
- **Batting Tables**: Two-column layout for both teams
  - Columns: Player, Pos, AB, R, H, RBI, BB, SO, LOB
  - Totals row at bottom
- **Pitching Tables**: Two-column layout for both teams
  - Columns: Player, IP, H, R, ER, BB, SO, NP
  - Totals row at bottom
- **Game Notes**: HR and SB highlights
- **Navigation**: "Box Score" button added to live game header

#### PDF Box Score Generation - COMPLETED ✅
Backend endpoint: `GET /api/games/{id}/boxscore/pdf`
- Uses reportlab to generate professional PDF
- Single-page layout fitting all content
- Includes: Title, date/location, final score, inning-by-inning, batting stats, pitching stats
- **Excludes**: Umpire, game time, attendance, weather (as requested)
- Download button on web box score page

### January 2026 - P0 BUG FIX: BATTING ORDER CONTINUITY ✅

#### Batting Order Reset Bug - FIXED ✅
**Issue**: The batting order for a team incorrectly reset to the first batter at the start of a new inning, instead of continuing from where that team left off.

**Root Cause**: In `handleInPlayResult`, when the 3rd out occurred (e.g., ground out, fly out), the batter index was NOT being advanced because the advancement code was inside an `else` block that only ran when outs < 3.

**Fix Applied**:
- Moved batter index advancement to occur BEFORE the 3-out check
- Now all in-play results advance the batter unconditionally
- Each team's batter index is tracked separately (`homeBatterIndex`, `awayBatterIndex`)

**Verified**: Testing agent confirmed batting order continues correctly across innings.

### January 2026 - TOTAL PITCHES FEATURE ✅

#### Pitch Count Added to Team Stats - COMPLETED ✅
- Added **P (Pitches)** column to Team Stats display
- Shows total pitches thrown by each team's pitchers
- Displayed in blue text for visual distinction
- Updates in real-time after each pitch is recorded
- 7-column layout: R, H, E, SO, BB, P

### January 2026 - CODE REFACTORING ✅

#### Custom Hooks Created ✅
Extracted reusable game logic from `BaseballLiveGame.jsx` into custom hooks at `/app/frontend/src/hooks/`:

1. **`useGameHistory.js`** - Undo/redo state management
   - `saveStateForUndo()` - Snapshot current state
   - `popLastState()` - Restore previous state
   - `canUndo` - Check if undo available
   
2. **`usePlayerStats.js`** - Player stat updates
   - `updateBatterStats()` - Increment batter stats
   - `updatePitcherStats()` - Increment pitcher stats
   - `calcTeamTotals()` - Aggregate team statistics
   
3. **`useBaseRunners.js`** - Base runner management
   - `advanceRunners()` - Automatic base advancement for hits/walks
   - `moveRunner()` - Manual runner movement
   - `handleSteal()` - Stolen base logic
   - `removeRunner()` - Caught stealing/pickoff
   
4. **`usePlayByPlay.js`** - Play-by-play log management
   - `addPlay()` - Add play with deduplication
   - `removeLastPlay()` - For undo
   - Prevents duplicate entries from React strict mode

### January 10, 2026 - GAME CONTROL & WRAP-UP BUTTONS ✅

#### Two Control Buttons - COMPLETED ✅
1. **Game Control** (Blue button)
   - Opens modal to change inning and score
   - Inning: "-/+" buttons and Top/Bottom toggle
   - Score: "-/+" controls for each team with team colors
   - "Apply Changes" button updates game state
   - Changes are undoable via Undo button

2. **Wrap-Up** (Amber button, becomes green "Game FINAL" when finalized)
   - Live Stat Output (Coming Soon)
   - PDF Box Score (Coming Soon)
   - Finalize Game flow with pitcher selection

#### Game Control Modal Features - COMPLETED ✅
- **Inning selector**: Number with -/+ buttons
- **Top/Bottom toggle**: Visual toggle buttons
- **Team score controls**: Each team shows:
  - Team color indicator
  - Team name
  - Current score with -/+ buttons
- **Apply Changes**: Green button to save changes
- **Toast notification**: "Game updated" on success
- **Undo support**: Changes saved to undo history

### January 10, 2026 - GAME CONTROLS & FINALIZATION ✅

#### Game Controls Button - COMPLETED ✅
- **Location**: Below Team Stats table
- **Button**: Shows "Game Controls" (gray) or "Game FINAL" (green when finalized)
- **Modal with 3 options**:
  1. **Live Stat Output** - Green button (Coming Soon placeholder)
  2. **PDF Box Score** - Blue button (Coming Soon placeholder)
  3. **Finalize Game** - Amber button opens finalization flow

#### Game Finalization Flow - COMPLETED ✅
- **Current Score display**: Shows team scores at finalization time
- **Winning Pitcher dropdown**: Select from winning team's roster
- **Losing Pitcher dropdown**: Select from losing team's roster
- **Saving Pitcher dropdown**: Select from winning team's roster OR "No Save"
- **End Game button**: Appears only when all 3 selections made
- **On finalization**:
  - Game status set to "final"
  - Toast notification: "Game finalized! Status: FINAL"
  - Play-by-play log shows "FINAL: [Away] [score] - [score] [Home]"
  - Button changes to green "Game FINAL"
  - Data saved to backend (in non-demo mode)

### January 10, 2026 - UNDO FEATURE & OUTFIELDER REPOSITIONING ✅

#### Undo Feature - COMPLETED ✅
- **Undo Button** in header shows count of undoable actions
- **Full State Rollback** - undoes everything:
  - Game state (score, outs, balls, strikes, inning)
  - Base runners (moves them back)
  - Player stats (removes added stats)
  - Play-by-play log (removes the last play)
  - Batting order index (restores previous batter)
  - Team errors
- **20-state history** - keeps last 20 actions for undo
- **Toast notification** - "Play undone" confirmation

#### Outfielder Repositioning - COMPLETED ✅
Per user-provided reference image:
- **LF**: top: 24%, left: 18%
- **CF**: top: 6%, left: 50%  
- **RF**: top: 24%, left: 82%
All outfielders now positioned correctly on the outfield grass

### January 10, 2026 - BASE RUNNER SYSTEM & UI ENHANCEMENTS ✅

#### Base Runner Advancement Logic - COMPLETED ✅
- **Single**: Batter to 1st, runner on 1st to 2nd, runner on 2nd to 3rd, runner on 3rd scores
- **Double**: Batter to 2nd, runner on 1st to 3rd, runners on 2nd/3rd score
- **Triple**: Batter to 3rd, all runners score
- **Home Run**: All runners + batter score, bases cleared
- **Walk/HBP**: Force runners if needed, batter to 1st
- **advanceRunners()** function handles all base advancement automatically

#### Clickable Base Runners with Actions - COMPLETED ✅
- **Click on runner** - Opens BaseRunnerModal with options:
  - 🏃 **Steal Base** - Advances runner one base, adds stolen base stat
  - ❌ **Caught Stealing** - Adds out, removes runner from base
  - ⚠️ **Picked Off** - Adds out, removes runner from base
  - **Move Runner To** - Buttons for 1st, 2nd, or 3rd (available bases only)
- All actions logged to play-by-play with proper descriptions

#### Outfielders Fixed - COMPLETED ✅
- **LF** at top:18%, left:20%
- **CF** at top:10%, left:50%
- **RF** at top:18%, left:80%
- All 9 positions now visible on field image

#### Team Stats Updated - COMPLETED ✅
- Now shows: **R** (runs), **H** (hits), **E** (errors - in red), **SO** (strikeouts), **BB** (walks)
- Runs shown in green for emphasis
- Error tracking added per team

#### Scoreboard Redesign - COMPLETED ✅
- **B/S/O indicators** moved next to inning and centered
- Compact format: B (green dots), S (red dots), O (yellow dots)
- Inning indicator with top/bottom arrows
- More space efficient layout

### January 10, 2026 - P1 TASKS COMPLETED ✅

#### Back Button Navigation Fix - COMPLETED ✅
All live game components now navigate to `/dashboard` (sport's main page):
- `LiveGame.jsx` - Line 1738
- `FootballLiveGame.jsx` - Line 2874
- `AdvancedLiveGame.jsx` - Line 668
- `BaseballLiveGame.jsx` - Line 1441 (demo mode goes to `/`, logged-in to `/dashboard`)

#### Baseball Layout Reorganization - COMPLETED ✅
New condensed 3-column layout:
- **LEFT (col-span-3)**: Play-by-Play Log + Batting Order
- **CENTER (col-span-6)**: Baseball Diamond (field image)
- **RIGHT (col-span-3)**: Pitch Result Buttons + Team Stats Table
- All content fits on screen without scrolling

#### Real-Time Stats Updates - COMPLETED ✅
- **At Bat Box**: Shows batter's H-AB, K stats - updates after each plate appearance
- **Pitcher Box**: Shows pitch count (P) and strikeouts (K) - updates after each pitch
- **Team Stats Table**: Shows H, AB, R, K, BB columns for both teams - updates in real-time
- Added `updateBatterStats()` and `updatePitcherStats()` helper functions

#### All 9 Fielders Visible - COMPLETED ✅
Baseball diamond now displays all positions: LF, CF, RF, SS, 2B, 3B, P, 1B, C

### January 10, 2026 - CRITICAL BUG FIX: Teams Not Showing Up

#### Teams Bug FIX - COMPLETED ✅
**Root Cause**: `TeamDetail.jsx` was not including the `sport` field when saving team data. The backend `TeamCreate` model defaulted `sport` to `"basketball"`, so when saving a baseball/football team, it would silently change the sport to basketball, causing the team to disappear from the sport-filtered teams list.

**Fix Applied**:
1. **Frontend (`TeamDetail.jsx`)**: Added `teamSport` state that tracks the team's sport on load and includes it in all PUT requests
2. **Backend (`server.py` PUT /api/teams)**: Added safeguard logic to preserve existing sport if incoming sport is the default "basketball" but existing sport is different

**Verified**: 7/7 backend tests passed, team sport persistence confirmed working

### January 10, 2026 - Baseball Tracker Enhancements

#### Play-by-Play Log Fixes - COMPLETED ✅
- **No More Doubling**: Refactored state updates to use `addPlay()` helper with `lastPlayIdRef` for deduplication
- **Player Names Shown**: All plays now include player number and name (e.g., "Ball 1 - #2 Ryan Smith")
- **Unique IDs**: Each play has a unique ID using timestamp + counter

#### Baseball Field Enhancements - COMPLETED ✅
- **Runner Numbers on Bases**: Runners now show their jersey number on the base indicator (instead of just yellow dots)
- **Team Colors on Field**: 
  - Fielder position boxes use the fielding team's color
  - Runner indicators use the batting team's color
- Added `fieldingTeamColor` and `battingTeamColor` props to `BaseballDiamond` component

#### Substitution Feature - COMPLETED ✅
- **Substitution Icon**: ArrowLeftRight icon added to each player in batting order
- **Substitution Dialog**: 3-option dialog when clicking substitute:
  - Offensive Only (Batting Order) - green button
  - Defensive Only (Field Position) - blue button
  - Both (Full Substitution) - purple button
- **Player Selection**: After choosing type, dropdown shows available bench players
- **Auto-Advance**: Batting order auto-advances after at-bat concludes

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
