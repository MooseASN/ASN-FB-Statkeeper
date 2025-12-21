# Basketball Statistics Tracking App - Requirements

## Original Problem Statement
Build a basketball statistics tracking website similar to pressboxhoops.com with the following features:

### Team Management
- Logo upload
- Name
- Roster uploads (Number, name) via manual entry or CSV file upload

### Personal Statistics Tracking
- Free Throws (Make or Miss)
- 2pt field goals (Make or Miss)
- 3pt field goals (Make or Miss)
- Assist
- Offensive and defensive rebounds
- Turnover
- Steal
- Block
- Foul

### Additional Features
- Calculate team fouls
- Calculate shooting percentages
- Calculate team stats (rebounds, steals, etc.)
- Quarter-by-quarter scores
- Create a live stat viewing page that can be shared via link
- Export box score PDF files
- No clock, just quarter tracking
- Ability to add players mid-game

## Architecture Implemented

### Backend (FastAPI + MongoDB)
- **Teams Collection**: id, name, logo_url, roster[], created_at
- **Games Collection**: id, home/away team info, status, current_quarter, quarter_scores, share_code
- **PlayerStats Collection**: game_id, team_id, player info, all stat fields

### API Endpoints
- `POST/GET/PUT/DELETE /api/teams` - Team CRUD
- `POST /api/teams/{id}/roster/csv` - CSV roster upload
- `POST/GET /api/games` - Game management
- `GET /api/games/{id}` - Get game with full stats
- `GET /api/games/share/{code}` - Public share link
- `PUT /api/games/{id}` - Update quarter/status
- `POST /api/games/{id}/stats` - Record stat event
- `POST /api/games/{id}/players` - Add player mid-game
- `GET /api/games/{id}/boxscore/pdf` - Generate PDF

### Frontend (React + Tailwind + Shadcn UI)
- Dashboard with quick stats
- Teams management page
- Team detail with roster editing
- New game setup
- **Split UI Live Game Page** (pressboxhoops style)
- Public live view page
- Game history page

## Tasks Completed
1. ✅ Team creation with logo and roster
2. ✅ Manual player entry
3. ✅ CSV roster upload
4. ✅ All personal statistics tracking (FT, 2PT, 3PT, AST, OREB, DREB, TO, STL, BLK, PF)
5. ✅ Team fouls calculation
6. ✅ Shooting percentage calculation (FG%, 3PT%, FT% for players and teams)
7. ✅ Team stats aggregation (OREB, DREB, Total REB, Steals separated)
8. ✅ Quarter-by-quarter scores with overtime support
9. ✅ Shareable live stats page with full box score and shooting stats
10. ✅ PDF box score export with all stats
11. ✅ Quarter tracking with overtime capability (OT1, OT2, etc.)
12. ✅ Add players mid-game
13. ✅ Split UI with players on both sides
14. ✅ Undo last action feature
15. ✅ Make/Miss modal when clicking FT, 2PT, 3PT buttons
16. ✅ Player shooting stats display (FG: X/Y Z%, 3PT: X/Y Z%, FT: X/Y Z%)
17. ✅ Team shooting stats in team stats area
18. ✅ Play-by-Play log (without timestamps)

## Next Tasks / Enhancements
1. Add overtime period support
2. Player substitution tracking
3. Play-by-play log
4. Hot streak indicator (who's scoring most recently)
5. Season/tournament management
6. Team logo file upload (currently URL only)
7. Print-optimized box score view
8. Mobile-optimized touch interface
9. Sound effects for scoring events
10. Keyboard shortcuts for power users
