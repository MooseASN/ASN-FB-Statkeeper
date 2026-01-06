/**
 * Football Penalty Catalog
 * 
 * Universal penalty IDs with per-ruleset variants (NFHS, NCAA, NAIA)
 * NAIA follows NCAA rules unless explicitly overridden.
 * 
 * Enforcement types:
 * - previous_spot: From the previous spot (where play started)
 * - spot_of_foul: From where the foul occurred
 * - end_of_run: From where the run ended
 * - succeeding_spot: From the succeeding spot (where ball will be put in play next)
 * - basic_spot: The basic spot for the play
 */

export const RULESETS = {
  NFHS: { id: 'NFHS', name: 'NFHS (High School)', shortName: 'NFHS' },
  NCAA: { id: 'NCAA', name: 'NCAA (College)', shortName: 'NCAA' },
  NAIA: { id: 'NAIA', name: 'NAIA (College)', shortName: 'NAIA' },
};

export const PENALTY_CATEGORIES = {
  PRE_SNAP: 'Pre-Snap',
  BLOCKING: 'Blocking',
  BALL_CARRIER: 'Ball Carrier',
  PASSING: 'Passing',
  KICKING: 'Kicking',
  PERSONAL_FOUL: 'Personal Foul',
  UNSPORTSMANLIKE: 'Unsportsmanlike',
  SAFETY: 'Player Safety',
  OTHER: 'Other',
};

export const ENFORCEMENT_TYPES = {
  PREVIOUS_SPOT: 'previous_spot',
  SPOT_OF_FOUL: 'spot_of_foul',
  END_OF_RUN: 'end_of_run',
  SUCCEEDING_SPOT: 'succeeding_spot',
  BASIC_SPOT: 'basic_spot',
};

/**
 * Context questions for penalties that require additional information
 */
export const CONTEXT_QUESTIONS = {
  SPOT_OF_FOUL: {
    id: 'spot_of_foul',
    question: 'Where did the foul occur? (yard line)',
    type: 'yardline',
  },
  BEHIND_LOS: {
    id: 'behind_los',
    question: 'Was the foul behind the line of scrimmage?',
    type: 'boolean',
  },
  DURING_KICK: {
    id: 'during_kick',
    question: 'Did this occur during a kicking play?',
    type: 'boolean',
  },
  HALF_DISTANCE: {
    id: 'half_distance',
    question: 'Half the distance to the goal applies?',
    type: 'info', // Just informational
  },
  PLAYER_NUMBER: {
    id: 'player_number',
    question: 'Player number who committed the foul (optional)',
    type: 'player',
  },
};

/**
 * Main Penalty Catalog
 * 
 * Each penalty has:
 * - penalty_id: Stable internal identifier
 * - display_name: Human-readable name
 * - aliases: Array of synonyms/abbreviations for fuzzy matching
 * - category: Category from PENALTY_CATEGORIES
 * - requires_context: Array of CONTEXT_QUESTIONS ids (only if enforcement depends on context)
 * - variants: Object with NFHS, NCAA, NAIA specific rules
 * 
 * Each variant has:
 * - yards: Number or 'spot' for spot-based
 * - enforcement: From ENFORCEMENT_TYPES
 * - auto_first_down: Boolean
 * - loss_of_down: Boolean
 * - disqualification: 'none', 'player_dq', or 'ejection'
 * - notes: Short explanation
 */
export const PENALTY_CATALOG = [
  // === PRE-SNAP PENALTIES ===
  {
    penalty_id: 'false_start',
    display_name: 'False Start',
    aliases: ['false start', 'fs', 'false-start', 'fstart', 'illegal motion before snap'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul, replay down',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul, replay down',
      },
      // NAIA follows NCAA
    },
  },
  {
    penalty_id: 'encroachment',
    display_name: 'Encroachment',
    aliases: ['encroachment', 'enc', 'encroach', 'offsides contact'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul',
      },
    },
  },
  {
    penalty_id: 'offside',
    display_name: 'Offsides',
    aliases: ['offsides', 'offside', 'off side', 'off-side', 'ofs'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Can be accepted at end of play',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Live ball foul',
      },
    },
  },
  {
    penalty_id: 'neutral_zone_infraction',
    display_name: 'Neutral Zone Infraction',
    aliases: ['nzi', 'neutral zone', 'neutral zone infraction', 'nz infraction'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul when causing offensive player to move',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul',
      },
    },
  },
  {
    penalty_id: 'delay_of_game',
    display_name: 'Delay of Game',
    aliases: ['delay of game', 'delay', 'dog', 'dg', 'delay-of-game', 'play clock'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball foul',
      },
    },
  },
  {
    penalty_id: 'too_many_men',
    display_name: 'Too Many Men on Field',
    aliases: ['too many men', 'too many players', '12 men', 'twelve men', 'illegal substitution', 'tmm'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball or live ball foul',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Dead ball or live ball foul',
      },
    },
  },
  {
    penalty_id: 'illegal_formation',
    display_name: 'Illegal Formation',
    aliases: ['illegal formation', 'illegal form', 'bad formation', 'formation'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Live ball foul',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Live ball foul',
      },
    },
  },
  {
    penalty_id: 'illegal_motion',
    display_name: 'Illegal Motion',
    aliases: ['illegal motion', 'motion', 'ill motion', 'illegal shift'],
    category: PENALTY_CATEGORIES.PRE_SNAP,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Live ball foul',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Live ball foul',
      },
    },
  },

  // === BLOCKING PENALTIES ===
  // Unified Holding penalty - rules differ based on which team commits it
  {
    penalty_id: 'holding',
    display_name: 'Holding',
    aliases: ['holding', 'hold', 'h'],
    category: PENALTY_CATEGORIES.BLOCKING,
    requires_context: [],
    can_be_committed_by: 'both', // Can be offense or defense
    team_variants: {
      offense: {
        NFHS: {
          yards: 10,
          enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
          auto_first_down: false,
          loss_of_down: false,
          disqualification: 'none',
          notes: 'Enforced from previous spot',
        },
        NCAA: {
          yards: 10,
          enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
          auto_first_down: false,
          loss_of_down: false,
          disqualification: 'none',
          notes: 'Enforced from previous spot',
        },
      },
      defense: {
        NFHS: {
          yards: 5,
          enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
          auto_first_down: true,
          loss_of_down: false,
          disqualification: 'none',
          notes: 'Automatic first down',
        },
        NCAA: {
          yards: 10,
          enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
          auto_first_down: true,
          loss_of_down: false,
          disqualification: 'none',
          notes: 'Automatic first down',
        },
      },
    },
    // Legacy variants field for backwards compatibility
    variants: {
      NFHS: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Select team to see specific yardage',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Select team to see specific yardage',
      },
    },
  },
  {
    penalty_id: 'holding_offense',
    display_name: 'Holding (Offense)',
    aliases: ['offensive holding', 'oh', 'o holding', 'off holding'],
    category: PENALTY_CATEGORIES.BLOCKING,
    requires_context: [],
    hidden: true, // Hide from main list, use unified 'holding' instead
    variants: {
      NFHS: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Enforced from previous spot',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Enforced from previous spot',
      },
    },
  },
  {
    penalty_id: 'holding_defense',
    display_name: 'Holding (Defense)',
    aliases: ['defensive holding', 'dh', 'd holding', 'def holding'],
    category: PENALTY_CATEGORIES.BLOCKING,
    requires_context: [],
    hidden: true, // Hide from main list, use unified 'holding' instead
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Automatic first down',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Automatic first down',
      },
    },
  },
  // Unified Pass Interference - rules differ based on which team commits it
  {
    penalty_id: 'pass_interference',
    display_name: 'Pass Interference',
    aliases: ['pass interference', 'pi', 'interference', 'dpi', 'opi'],
    category: PENALTY_CATEGORIES.PASSING,
    requires_context: ['spot_of_foul'],
    can_be_committed_by: 'both',
    team_variants: {
      offense: {
        NFHS: {
          yards: 15,
          enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
          auto_first_down: false,
          loss_of_down: true,
          disqualification: 'none',
          notes: 'Loss of down',
        },
        NCAA: {
          yards: 15,
          enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
          auto_first_down: false,
          loss_of_down: true,
          disqualification: 'none',
          notes: 'Loss of down',
        },
      },
      defense: {
        NFHS: {
          yards: 15,
          enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
          auto_first_down: true,
          loss_of_down: false,
          disqualification: 'none',
          notes: 'Automatic first down (NFHS is 15 yards)',
        },
        NCAA: {
          yards: 'spot',
          enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
          auto_first_down: true,
          loss_of_down: false,
          disqualification: 'none',
          notes: 'Spot foul, automatic first down',
        },
      },
    },
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Select team to see specific enforcement',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Select team to see specific enforcement',
      },
    },
  },
  {
    penalty_id: 'illegal_block_back',
    display_name: 'Illegal Block in the Back',
    aliases: ['block in the back', 'block in back', 'ibb', 'illegal block back', 'clipping'],
    category: PENALTY_CATEGORIES.BLOCKING,
    requires_context: ['spot_of_foul'],
    variants: {
      NFHS: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Enforced from basic spot',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Enforced from basic spot',
      },
    },
  },
  {
    penalty_id: 'chop_block',
    display_name: 'Chop Block',
    aliases: ['chop block', 'chop', 'chopblock'],
    category: PENALTY_CATEGORIES.BLOCKING,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Personal foul',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Personal foul',
      },
    },
  },
  {
    penalty_id: 'illegal_use_of_hands',
    display_name: 'Illegal Use of Hands',
    aliases: ['illegal hands', 'illegal use of hands', 'hands to face', 'iuh', 'hands'],
    category: PENALTY_CATEGORIES.BLOCKING,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Offensive or defensive',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Offensive or defensive',
      },
    },
  },

  // === PASSING PENALTIES ===
  {
    penalty_id: 'pass_interference_offensive',
    display_name: 'Offensive Pass Interference',
    aliases: ['opi', 'offensive pi', 'offensive pass interference', 'push off', 'off pi'],
    category: PENALTY_CATEGORIES.PASSING,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: 'Loss of down',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: 'Loss of down',
      },
    },
  },
  {
    penalty_id: 'pass_interference_defensive',
    display_name: 'Defensive Pass Interference',
    aliases: ['dpi', 'pi', 'pass interference', 'defensive pi', 'def pi', 'interference'],
    category: PENALTY_CATEGORIES.PASSING,
    requires_context: ['spot_of_foul'],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false, // NOT auto first down in NFHS!
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards from previous spot, NO automatic first down in NFHS',
      },
      NCAA: {
        yards: 'spot',
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: true, // Auto first down in NCAA
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Spot foul with automatic first down',
      },
      NAIA: {
        yards: 'spot',
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: true, // Auto first down in NAIA (follows NCAA)
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Spot foul with automatic first down (follows NCAA)',
      },
    },
  },
  {
    penalty_id: 'intentional_grounding',
    display_name: 'Intentional Grounding',
    aliases: ['grounding', 'intentional grounding', 'ig', 'int grounding'],
    category: PENALTY_CATEGORIES.PASSING,
    requires_context: ['spot_of_foul'],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: '5 yards from previous spot and loss of down (NOT spot foul in NFHS)',
      },
      NCAA: {
        yards: 'spot',
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: 'Spot foul and loss of down',
      },
      NAIA: {
        yards: 'spot',
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: 'Spot foul and loss of down (follows NCAA)',
      },
    },
  },
  {
    penalty_id: 'ineligible_downfield',
    display_name: 'Ineligible Receiver Downfield',
    aliases: ['ineligible downfield', 'ineligible receiver downfield', 'ird', 'lineman downfield', 'illegal man downfield'],
    category: PENALTY_CATEGORIES.PASSING,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '5 yards - lineman cannot be more than 3 yards downfield (NFHS: 3 yards)',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '5 yards - lineman cannot be more than 3 yards downfield',
      },
    },
  },
  {
    penalty_id: 'illegal_forward_pass',
    display_name: 'Illegal Forward Pass',
    aliases: ['illegal pass', 'illegal forward pass', 'ifp', 'pass beyond los', 'second forward pass'],
    category: PENALTY_CATEGORIES.PASSING,
    requires_context: ['spot_of_foul'],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: '5 yards from spot and loss of down',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: '5 yards from spot and loss of down',
      },
    },
  },
  {
    penalty_id: 'illegal_touching',
    display_name: 'Illegal Touching of Forward Pass',
    aliases: ['illegal touching', 'ineligible touching', 'illegal touch'],
    category: PENALTY_CATEGORIES.PASSING,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: 'Loss of down',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: true,
        disqualification: 'none',
        notes: 'Loss of down',
      },
    },
  },

  // === KICKING PENALTIES ===
  {
    penalty_id: 'kick_catch_interference',
    display_name: 'Kick Catch Interference',
    aliases: ['kci', 'kick catch interference', 'fair catch interference', 'punt interference'],
    category: PENALTY_CATEGORIES.KICKING,
    requires_context: ['spot_of_foul'],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards from spot of foul',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.SPOT_OF_FOUL,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards from spot of foul',
      },
    },
  },
  {
    penalty_id: 'running_into_kicker',
    display_name: 'Running Into the Kicker',
    aliases: ['running into kicker', 'rik', 'running into punter', 'into kicker'],
    category: PENALTY_CATEGORIES.KICKING,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '5 yards, automatic first down',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false, // Not auto first down in NCAA for running into
        loss_of_down: false,
        disqualification: 'none',
        notes: '5 yards',
      },
    },
  },
  {
    penalty_id: 'roughing_kicker',
    display_name: 'Roughing the Kicker',
    aliases: ['roughing the kicker', 'rtk', 'roughing kicker', 'rough kicker', 'roughing punter'],
    category: PENALTY_CATEGORIES.KICKING,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down',
      },
    },
  },
  {
    penalty_id: 'illegal_kick',
    display_name: 'Illegal Kick',
    aliases: ['illegal kick', 'illegal kicking', 'ik'],
    category: PENALTY_CATEGORIES.KICKING,
    requires_context: ['spot_of_foul'],
    variants: {
      NFHS: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Enforced from basic spot',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Enforced from basic spot',
      },
    },
  },

  // === PERSONAL FOUL PENALTIES ===
  {
    penalty_id: 'roughing_passer',
    display_name: 'Roughing the Passer',
    aliases: ['roughing the passer', 'rtp', 'roughing passer', 'rough passer', 'late hit qb'],
    category: PENALTY_CATEGORIES.PERSONAL_FOUL,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.END_OF_RUN,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards from end of play, automatic first down',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.END_OF_RUN,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards from end of play, automatic first down',
      },
    },
  },
  {
    penalty_id: 'unnecessary_roughness',
    display_name: 'Unnecessary Roughness',
    aliases: ['unnecessary roughness', 'ur', 'unr', 'late hit', 'piling on', 'personal foul'],
    category: PENALTY_CATEGORIES.PERSONAL_FOUL,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down if against offense',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down if against offense',
      },
    },
  },
  {
    penalty_id: 'facemask',
    display_name: 'Facemask',
    aliases: ['facemask', 'face mask', 'fm', 'grabbing facemask', 'facemask grab'],
    category: PENALTY_CATEGORIES.PERSONAL_FOUL,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down if on defense',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down if on defense',
      },
    },
  },
  {
    penalty_id: 'horse_collar',
    display_name: 'Horse Collar Tackle',
    aliases: ['horse collar', 'horsecollar', 'hc', 'horse collar tackle'],
    category: PENALTY_CATEGORIES.PERSONAL_FOUL,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down if on defense',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, automatic first down if on defense',
      },
    },
  },
  {
    penalty_id: 'targeting',
    display_name: 'Targeting',
    aliases: ['targeting', 'target', 'helmet to helmet', 'h2h', 'head hunting'],
    category: PENALTY_CATEGORIES.SAFETY,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'none', // NFHS does not have targeting with auto-ejection
        notes: 'NFHS: 15 yards for spearing/helmet contact - NO automatic ejection',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'ejection', // NCAA has automatic ejection
        notes: 'Automatic ejection - player disqualified from game. Subject to replay review.',
      },
      NAIA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'ejection', // NAIA follows NCAA
        notes: 'Automatic ejection - player disqualified (follows NCAA)',
      },
    },
  },
  {
    penalty_id: 'spearing',
    display_name: 'Spearing',
    aliases: ['spearing', 'spear', 'leading with helmet'],
    category: PENALTY_CATEGORIES.SAFETY,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'player_dq',
        notes: '15 yards, possible disqualification',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: true,
        loss_of_down: false,
        disqualification: 'ejection',
        notes: 'Covered under targeting rules',
      },
    },
  },

  // === UNSPORTSMANLIKE PENALTIES ===
  {
    penalty_id: 'unsportsmanlike_conduct',
    display_name: 'Unsportsmanlike Conduct',
    aliases: ['unsportsmanlike', 'unsportsmanlike conduct', 'uc', 'usc', 'taunting', 'celebration'],
    category: PENALTY_CATEGORIES.UNSPORTSMANLIKE,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.SUCCEEDING_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, 2nd UC results in disqualification',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.SUCCEEDING_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards, 2nd UC results in disqualification',
      },
    },
  },
  {
    penalty_id: 'sideline_interference',
    display_name: 'Sideline Interference',
    aliases: ['sideline interference', 'sideline warning', 'bench penalty', 'coaches on field'],
    category: PENALTY_CATEGORIES.UNSPORTSMANLIKE,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.SUCCEEDING_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Warning first, then 15 yards',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.SUCCEEDING_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Warning first, then 15 yards',
      },
    },
  },

  // === OTHER PENALTIES ===
  {
    penalty_id: 'illegal_participation',
    display_name: 'Illegal Participation',
    aliases: ['illegal participation', 'illegal player', 'illegal sub'],
    category: PENALTY_CATEGORIES.OTHER,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards from basic spot',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '15 yards from basic spot',
      },
    },
  },
  {
    penalty_id: 'illegal_equipment',
    display_name: 'Illegal Equipment',
    aliases: ['illegal equipment', 'equipment violation', 'missing equipment'],
    category: PENALTY_CATEGORIES.OTHER,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 0,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Player must leave game for one play',
      },
      NCAA: {
        yards: 0,
        enforcement: ENFORCEMENT_TYPES.PREVIOUS_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Player must leave game for one play',
      },
    },
  },
  {
    penalty_id: 'tripping',
    display_name: 'Tripping',
    aliases: ['tripping', 'trip'],
    category: PENALTY_CATEGORIES.OTHER,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '10 yards from basic spot',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '10 yards from basic spot',
      },
    },
  },
  {
    penalty_id: 'helping_runner',
    display_name: 'Helping the Runner',
    aliases: ['helping runner', 'assisting runner', 'pushing runner', 'helping the runner'],
    category: PENALTY_CATEGORIES.OTHER,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '5 yards from basic spot',
      },
      NCAA: {
        yards: 5,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '5 yards from basic spot',
      },
    },
  },
  {
    penalty_id: 'illegal_batting',
    display_name: 'Illegal Batting',
    aliases: ['illegal batting', 'batting ball', 'illegal bat'],
    category: PENALTY_CATEGORIES.OTHER,
    requires_context: ['spot_of_foul'],
    variants: {
      NFHS: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '10 yards from basic spot',
      },
      NCAA: {
        yards: 10,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: '10 yards from basic spot',
      },
    },
  },
  {
    penalty_id: 'leaping',
    display_name: 'Leaping',
    aliases: ['leaping', 'hurdling', 'hurdle', 'leap'],
    category: PENALTY_CATEGORIES.OTHER,
    requires_context: [],
    variants: {
      NFHS: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Illegal for defense to leap over offensive line',
      },
      NCAA: {
        yards: 15,
        enforcement: ENFORCEMENT_TYPES.BASIC_SPOT,
        auto_first_down: false,
        loss_of_down: false,
        disqualification: 'none',
        notes: 'Illegal for defense to leap over offensive line',
      },
    },
  },
];

/**
 * Get penalty variant for a specific ruleset
 * NAIA follows NCAA unless explicitly defined
 */
export function getPenaltyVariant(penalty, ruleset, againstTeam = null) {
  if (!penalty) return null;
  
  // If penalty has team-specific variants and a team is specified, use those
  if (againstTeam && penalty.team_variants && penalty.team_variants[againstTeam]) {
    const teamVariants = penalty.team_variants[againstTeam];
    if (teamVariants[ruleset]) {
      return teamVariants[ruleset];
    }
    // NAIA defaults to NCAA
    if (ruleset === 'NAIA' && teamVariants.NCAA) {
      return teamVariants.NCAA;
    }
    return teamVariants.NFHS || null;
  }
  
  // Fall back to regular variants
  if (!penalty.variants) return null;
  
  // Check for explicit variant
  if (penalty.variants[ruleset]) {
    return penalty.variants[ruleset];
  }
  
  // NAIA defaults to NCAA if not explicitly defined
  if (ruleset === 'NAIA' && penalty.variants.NCAA) {
    return penalty.variants.NCAA;
  }
  
  // Default to NFHS if nothing else available
  return penalty.variants.NFHS || null;
}

/**
 * Search penalties by input string using aliases
 * Returns array of matching penalties with similarity scores
 */
export function searchPenalties(input, limit = 5) {
  if (!input || input.length < 2) return [];
  
  const searchLower = input.toLowerCase().trim();
  const results = [];
  
  for (const penalty of PENALTY_CATALOG) {
    // Skip hidden penalties (they're superseded by unified versions)
    if (penalty.hidden) continue;
    
    // Check display name
    const displayNameLower = penalty.display_name.toLowerCase();
    if (displayNameLower.includes(searchLower) || searchLower.includes(displayNameLower)) {
      results.push({
        penalty,
        score: displayNameLower === searchLower ? 100 : 80,
        matchType: 'display_name',
      });
      continue;
    }
    
    // Check aliases
    for (const alias of penalty.aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower === searchLower) {
        results.push({ penalty, score: 100, matchType: 'alias_exact' });
        break;
      } else if (aliasLower.includes(searchLower) || searchLower.includes(aliasLower)) {
        results.push({ penalty, score: 70, matchType: 'alias_partial' });
        break;
      } else if (aliasLower.startsWith(searchLower)) {
        results.push({ penalty, score: 60, matchType: 'alias_prefix' });
        break;
      }
    }
  }
  
  // Sort by score descending and limit results
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/**
 * Get penalty by ID
 */
export function getPenaltyById(penaltyId) {
  return PENALTY_CATALOG.find(p => p.penalty_id === penaltyId) || null;
}

/**
 * Get all penalties by category
 */
export function getPenaltiesByCategory(category) {
  return PENALTY_CATALOG.filter(p => p.category === category);
}

/**
 * Calculate penalty enforcement result
 * @param {Object} penalty - The penalty object from catalog
 * @param {string} ruleset - 'NFHS', 'NCAA', or 'NAIA'
 * @param {string} againstTeam - 'offense' or 'defense'
 * @param {Object} context - Additional context (spotOfFoul, ballPosition, etc.)
 * @returns {Object} Enforcement result with yards, new position, flags
 */
export function calculatePenaltyEnforcement(penalty, ruleset, againstTeam, context = {}) {
  // Use team-specific variant if available
  const variant = getPenaltyVariant(penalty, ruleset, againstTeam);
  if (!variant) return null;
  
  const { 
    ballPosition = 0, 
    spotOfFoul = ballPosition,
    endOfRun = ballPosition,
    possession = 'home',
    down = 1,
    distance = 10,
  } = context;
  
  let yardsApplied = variant.yards;
  let enforcementSpot = ballPosition;
  
  // Determine enforcement spot
  switch (variant.enforcement) {
    case ENFORCEMENT_TYPES.PREVIOUS_SPOT:
      enforcementSpot = ballPosition;
      break;
    case ENFORCEMENT_TYPES.SPOT_OF_FOUL:
      enforcementSpot = spotOfFoul;
      yardsApplied = variant.yards === 'spot' ? Math.abs(spotOfFoul - ballPosition) : variant.yards;
      break;
    case ENFORCEMENT_TYPES.END_OF_RUN:
      enforcementSpot = endOfRun;
      break;
    case ENFORCEMENT_TYPES.SUCCEEDING_SPOT:
      enforcementSpot = ballPosition;
      break;
    case ENFORCEMENT_TYPES.BASIC_SPOT:
      enforcementSpot = ballPosition;
      break;
    default:
      enforcementSpot = ballPosition;
  }
  
  // Direction: penalties against offense move ball back, against defense move forward
  // Must account for which team has possession:
  // - Home team moves left to right (0 → 100)
  // - Away team moves right to left (100 → 0)
  let direction;
  if (againstTeam === 'offense') {
    // Offense penalty moves ball backward (toward their own goal)
    direction = possession === 'home' ? -1 : 1;
  } else {
    // Defense penalty moves ball forward (toward defense's goal)
    direction = possession === 'home' ? 1 : -1;
  }
  
  // Calculate new ball position (simplified - real implementation would need goal line logic)
  let newPosition = enforcementSpot + (yardsApplied * direction);
  
  // Half-distance to goal if penalty would exceed
  // (Simplified check - real implementation needs more nuance)
  if (newPosition < 0) {
    newPosition = enforcementSpot / 2;
    yardsApplied = enforcementSpot - newPosition;
  } else if (newPosition > 100) {
    newPosition = enforcementSpot + ((100 - enforcementSpot) / 2);
    yardsApplied = newPosition - enforcementSpot;
  }
  
  return {
    yardsApplied: Math.round(yardsApplied),
    enforcementSpot,
    newPosition: Math.round(newPosition),
    autoFirstDown: againstTeam === 'defense' && variant.auto_first_down,
    lossOfDown: againstTeam === 'offense' && variant.loss_of_down,
    disqualification: variant.disqualification,
    replayDown: !variant.loss_of_down && againstTeam === 'offense',
    notes: variant.notes,
  };
}

export default PENALTY_CATALOG;
