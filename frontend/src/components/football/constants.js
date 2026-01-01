/**
 * Constants for football game tracking
 */

// Play type definitions with visual styling
export const PLAY_TYPES = [
  { id: 'run', label: 'Run', color: 'bg-green-600' },
  { id: 'pass', label: 'Pass', color: 'bg-blue-600' },
  { id: 'punt', label: 'Punt', color: 'bg-purple-600' },
  { id: 'kickoff', label: 'Kickoff', color: 'bg-orange-600' },
  { id: 'field_goal', label: 'Field Goal', color: 'bg-yellow-600' },
  { id: 'extra_point', label: 'Extra Pt', color: 'bg-yellow-700' },
  { id: 'penalty', label: 'Penalty', color: 'bg-red-600' },
  { id: 'other', label: 'Other', color: 'bg-zinc-600' },
];

// Play result buttons for each play type
export const PLAY_RESULTS = {
  run: [
    { id: 'gain', label: 'Gain' },
    { id: 'no_gain', label: 'No Gain' },
    { id: 'loss', label: 'Loss' },
    { id: 'first_down', label: '1st Down' },
    { id: 'touchdown', label: 'Touchdown' },
    { id: 'fumble_rec', label: 'Fumble/Rec' },
    { id: 'fumble_lost', label: 'Fumble/Lost' },
    { id: 'safety', label: 'Safety' },
  ],
  pass: [
    { id: 'complete', label: 'Complete' },
    { id: 'incomplete', label: 'Incomplete' },
    { id: 'first_down', label: '1st Down' },
    { id: 'touchdown', label: 'Touchdown' },
    { id: 'sacked', label: 'Sacked' },
    { id: 'intercepted', label: 'Intercepted' },
    { id: 'dropped', label: 'Dropped' },
    { id: 'broken_up', label: 'Broken Up' },
  ],
  punt: [
    { id: 'punted', label: 'Punted' },
    { id: 'blocked', label: 'Blocked' },
    { id: 'touchback', label: 'Touchback' },
    { id: 'fair_catch', label: 'Fair Catch' },
    { id: 'returned', label: 'Returned' },
    { id: 'muffed', label: 'Muffed' },
  ],
  kickoff: [
    { id: 'touchback', label: 'Touchback' },
    { id: 'returned', label: 'Returned' },
    { id: 'onside_rec', label: 'Onside Rec' },
    { id: 'onside_lost', label: 'Onside Lost' },
    { id: 'out_of_bounds', label: 'Out of Bounds' },
  ],
  field_goal: [
    { id: 'good', label: 'Good' },
    { id: 'no_good', label: 'No Good' },
    { id: 'blocked', label: 'Blocked' },
  ],
  extra_point: [
    { id: 'good', label: 'Good' },
    { id: 'no_good', label: 'No Good' },
    { id: 'two_point_good', label: '2PT Good' },
    { id: 'two_point_no_good', label: '2PT No Good' },
  ],
  penalty: [
    { id: 'offense', label: 'On Offense' },
    { id: 'defense', label: 'On Defense' },
    { id: 'declined', label: 'Declined' },
    { id: 'offsetting', label: 'Offsetting' },
  ],
  other: [
    { id: 'timeout', label: 'Timeout' },
    { id: 'challenge', label: 'Challenge' },
    { id: 'injury', label: 'Injury' },
    { id: 'delay', label: 'Delay' },
  ],
};

// Default clock settings
export const DEFAULT_CLOCK_SETTINGS = {
  period_duration: 900, // 15 minutes in seconds
  halftime_duration: 1200, // 20 minutes
  play_clock: 40, // seconds
};

// Penalty catalog for quick selection
export const PENALTY_CATALOG = {
  offense: [
    { name: 'False Start', yards: 5 },
    { name: 'Holding', yards: 10 },
    { name: 'Offensive Pass Interference', yards: 10 },
    { name: 'Illegal Formation', yards: 5 },
    { name: 'Illegal Motion', yards: 5 },
    { name: 'Illegal Shift', yards: 5 },
    { name: 'Delay of Game', yards: 5 },
    { name: 'Intentional Grounding', yards: 10 },
    { name: 'Ineligible Receiver Downfield', yards: 5 },
    { name: 'Chop Block', yards: 15 },
    { name: 'Personal Foul', yards: 15 },
    { name: 'Unsportsmanlike Conduct', yards: 15 },
  ],
  defense: [
    { name: 'Offside', yards: 5 },
    { name: 'Encroachment', yards: 5 },
    { name: 'Neutral Zone Infraction', yards: 5 },
    { name: 'Defensive Pass Interference', yards: 15, spotFoul: true },
    { name: 'Defensive Holding', yards: 5, autoFirstDown: true },
    { name: 'Illegal Contact', yards: 5, autoFirstDown: true },
    { name: 'Roughing the Passer', yards: 15, autoFirstDown: true },
    { name: 'Roughing the Kicker', yards: 15, autoFirstDown: true },
    { name: 'Running into the Kicker', yards: 5 },
    { name: 'Face Mask', yards: 15 },
    { name: 'Personal Foul', yards: 15 },
    { name: 'Unsportsmanlike Conduct', yards: 15 },
    { name: 'Targeting', yards: 15, ejection: true },
  ],
  special: [
    { name: 'Kick Catch Interference', yards: 15 },
    { name: 'Illegal Kicking', yards: 10 },
    { name: 'Illegal Batting', yards: 10 },
    { name: 'Leverage', yards: 15 },
    { name: 'Leaping', yards: 15 },
    { name: 'Illegal Block in the Back', yards: 10 },
    { name: 'Clipping', yards: 15 },
    { name: 'Tripping', yards: 10 },
  ],
};

// Drive result options
export const DRIVE_RESULTS = [
  'Touchdown',
  'Field Goal',
  'Punt',
  'Turnover (INT)',
  'Turnover (Fumble)',
  'Turnover on Downs',
  'Safety',
  'End of Half',
  'End of Game',
];
