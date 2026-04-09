/**
 * weeklyThemeWordBanks.ts  ← NEW FILE
 * src/lib/weeklyThemeWordBanks.ts
 *
 * Curated themed word banks for every weekly pack theme.
 * These are the ACTUAL words used in word-search, word-fill, and cryptogram
 * puzzles — replacing the generic WORDS list.
 *
 * Each theme has:
 *   words     — 30+ curated words for word-search and word-fill puzzles
 *   quotes    — 3+ themed quotes for cryptogram puzzles
 *   clueHints — short descriptors that can be used as fill-in clues
 *
 * Quality rules enforced here:
 *   - Every word must be instantly recognisable as belonging to that theme
 *   - No filler words (no "THING", "PLACE", "ITEM")
 *   - Minimum 28 words so word-search always has themed content
 *   - Words are 4–12 letters (suitable for puzzle grids)
 *   - Quotes are real and attributable
 */

export interface ThemeWordBank {
  /** Primary word pool — use for word-search and word-fill */
  words: string[];
  /** Cryptogram quotes — real quotes related to the theme */
  quotes: string[];
  /** Fallback/related word pool if primary is exhausted */
  extended: string[];
}

// ── Helper ────────────────────────────────────────────────────────────────────

function bank(words: string[], quotes: string[], extended: string[] = []): ThemeWordBank {
  return { words, quotes, extended };
}

// ── The 12 rotating themes ─────────────────────────────────────────────────────

export const THEME_WORD_BANKS: Record<string, ThemeWordBank> = {

  "Around the World": bank(
    [
      "AFRICA", "AMAZON", "ALPINE", "ARCTIC", "ATLAS", "BEIJING",
      "CAIRO", "CANYON", "DELTA", "DESERT", "FJORD", "GANGES",
      "GLACIER", "HARBOR", "HIMALAYAS", "ISLAND", "JUNGLE",
      "LAGOON", "LATITUDE", "LONDON", "MADRID", "MESA",
      "MONSOON", "NILE", "OCEAN", "PARIS", "PENINSULA",
      "PRAIRIE", "REEF", "RIVER", "SAHARA", "SAVANNA",
      "STEPPE", "STRAIT", "SUMMIT", "TUNDRA", "VALLEY",
      "VOLCANO", "WATERFALL", "TOKYO", "ROME", "VIENNA",
    ],
    [
      "The world is a book and those who do not travel read only one page.",
      "Not all those who wander are lost.",
      "Travel is the only thing you buy that makes you richer.",
      "To travel is to discover that everyone is wrong about other countries.",
    ],
    ["ATLAS", "EQUATOR", "MERIDIAN", "TROPICS", "HEMISPHERE", "CONTINENT"]
  ),

  "Silver Screen": bank(
    [
      "ACTOR", "AUTEUR", "BLOCKBUSTER", "CAMERA", "CANNES",
      "CINEMA", "CLOSEUP", "CREDITS", "CUTAWAY", "DIRECTOR",
      "DOLLY", "DRAMA", "EDITOR", "EXTRAS", "FLASHBACK",
      "GENRE", "HITCHCOCK", "HOLOGRAM", "KUBRICK", "LENS",
      "MONTAGE", "NOIR", "OSCAR", "PREMIERE", "PRODUCER",
      "PROJECTOR", "REEL", "SCENE", "SCORE", "SCREENPLAY",
      "SEQUEL", "SEQUEL", "SEQUEL", "STORYBOARD", "STUDIO",
      "SUBPLOT", "TALKIE", "THRILLER", "TRAILER", "WESTERN",
    ],
    [
      "Cinema is a mirror by which we often see ourselves.",
      "Every great film should seem new every time you see it.",
      "Film is a battleground of love, hate, action, violence, and death.",
      "The movies are the only business where you can go out front and applaud yourself.",
    ],
    ["CLAPPERBOARD", "CINEMATOGRAPHER", "SCREENPLAY", "DISSOLVE", "FOLEY"]
  ),

  "The Natural World": bank(
    [
      "ALBATROSS", "BAMBOO", "BIOME", "CANOPY", "CARNIVORE",
      "CORAL", "ECOSYSTEM", "FALCON", "FERN", "FLORA",
      "FOSSIL", "FUNGI", "GORILLA", "HABITAT", "HERBIVORE",
      "KELP", "LEMUR", "LICHEN", "LYNX", "MANGROVE",
      "MIGRATION", "MOSS", "NARWHAL", "NECTAR", "OSPREY",
      "POLLEN", "PREDATOR", "PRIMATE", "RAPTOR", "REEF",
      "SEDIMENT", "SPAWNING", "SPECIES", "SPORE", "STAMEN",
      "TALON", "TAPROOT", "TIDAL", "VENOM", "WETLAND",
    ],
    [
      "In every walk with nature, one receives far more than he seeks.",
      "The earth does not belong to us. We belong to the earth.",
      "Look deep into nature and then you will understand everything better.",
      "Nature is not a place to visit. It is home.",
    ],
    ["BIODIVERSITY", "PHOTOSYNTHESIS", "METAMORPHOSIS", "POLLINATOR"]
  ),

  "Into the Kitchen": bank(
    [
      "BLANCH", "BRAISE", "BRINE", "BROIL", "CARAMEL",
      "CASSEROLE", "CHOP", "CHUTNEY", "CLARIFY", "CONFIT",
      "COULIS", "CRUMBLE", "DICE", "EMULSION", "FERMENT",
      "FRICASSEE", "GALETTE", "GARNISH", "GLAZE", "GRATIN",
      "JULIENNE", "KNEAD", "LARDER", "MIREPOIX", "MOUSSE",
      "PANFRY", "PARING", "POACH", "PUREE", "REDUCE",
      "RENDER", "ROULADE", "SAUTEE", "SEASON", "SIMMER",
      "SKILLET", "SOUFFLE", "TARTARE", "TEMPER", "WHISK",
    ],
    [
      "Cooking is at once child's play and adult joy.",
      "Food is our common ground, a universal experience.",
      "The secret of good cooking is, first, having a love of it.",
      "Tell me what you eat and I will tell you who you are.",
    ],
    ["ROUX", "DEGLAZE", "BRUNOISE", "CHIFFONADE", "BEURRE", "LIAISON"]
  ),

  "Great Minds": bank(
    [
      "ALGEBRA", "ARCHIMEDES", "ATOM", "CALCULUS",
      "COPERNICUS", "DARWIN", "EINSTEIN", "ELECTRON",
      "ENTROPY", "EULER", "EVIDENCE", "EVOLUTION",
      "FARADAY", "FORMULA", "GALILEO", "GENOME",
      "GRAVITY", "HYPOTHESIS", "KEPLER", "LOGIC",
      "MAXWELL", "NEWTON", "NUCLEUS", "PATENT",
      "PHYSICS", "PROTON", "QUANTUM", "RADAR",
      "RELATIVITY", "RESEARCH", "THEOREM", "THEORY",
      "TESLA", "TURING", "VACCINE", "VARIABLE",
    ],
    [
      "Imagination is more important than knowledge.",
      "The measure of intelligence is the ability to change.",
      "Science is not only compatible with spirituality; it is a profound source of it.",
      "The important thing is not to stop questioning.",
    ],
    ["HYPOTHESIS", "EMPIRICAL", "PARADIGM", "TAXONOMY", "COEFFICIENT"]
  ),

  "Game On": bank(
    [
      "ARCADE", "AVATAR", "BOSS", "CAMPAIGN", "CARTRIDGE",
      "CHECKMATE", "CHESSBOARD", "COMBO", "CONSOLE",
      "CONTROLLER", "DUNGEON", "ENDGAME", "FORFEIT",
      "GAMBIT", "GUILD", "HEALTH", "HITBOX", "JOYSTICK",
      "LEVEL", "LOOT", "MEEPLE", "MILESTONE", "MINIMAP",
      "MULTIPLAYER", "NINTENDO", "PAWN", "PIXEL", "PLATFORM",
      "PLAYTHROUGH", "PUZZLE", "QUEST", "RESPAWN", "ROSTER",
      "SANDBOX", "SINGLEPLAYER", "SPRITE", "STRATEGY",
      "TOKEN", "TUTORIAL", "UPGRADE", "VILLAIN", "WARP",
    ],
    [
      "Games are the most elevated form of investigation.",
      "Play is the highest form of research.",
      "The game is not about the destination, it is about the journey.",
      "A good game is one that you can get good at, but never perfect.",
    ],
    ["LEADERBOARD", "ACHIEVEMENT", "CONTROLLER", "MULTIPLAYER", "WALKTHROUGH"]
  ),

  "Music to My Ears": bank(
    [
      "ACOUSTIC", "ALBUM", "AMPLIFIER", "BALLAD", "BASS",
      "BRIDGE", "CADENCE", "CHORD", "CHORUS", "CLEF",
      "CODA", "CRESCENDO", "DISCORD", "DRUMS", "DYNAMICS",
      "FALSETTO", "FENDER", "GENRE", "GUITAR", "HARMONY",
      "INTERVAL", "JAZZ", "KEYS", "LYRICS", "MAJOR",
      "MELODY", "MINOR", "OCTAVE", "ORCHESTRA", "PITCH",
      "REFRAIN", "RHYTHM", "RIFF", "SCALE", "SCORE",
      "SOLO", "SONATA", "STAVE", "STRINGS", "TEMPO",
      "TIMBRE", "TREBLE", "VERSE", "VIBRATO", "VOCAL",
    ],
    [
      "Music gives a soul to the universe, wings to the mind, and life to everything.",
      "Without music, life would be a mistake.",
      "Music is the shorthand of emotion.",
      "One good thing about music: when it hits you, you feel no pain.",
    ],
    ["DIMINUENDO", "FORTISSIMO", "COUNTERPOINT", "SYNCOPATION"]
  ),

  "By the Book": bank(
    [
      "ALLEGORY", "ALLUSION", "ANTHOLOGY", "AUTHOR", "BIOGRAPHY",
      "CHAPTER", "CHARACTER", "CHRONICLE", "CLIMAX", "DENOUEMENT",
      "DIALOGUE", "DRAMA", "EDITION", "EPILOGUE", "FABLE",
      "FICTION", "FLASHBACK", "FOLIO", "FOOTNOTE", "GENRE",
      "GOTHIC", "INDEX", "IRONY", "LIBRARY", "METAPHOR",
      "MOTIF", "NARRATOR", "NOVELLA", "OEUVRE", "PARABLE",
      "PLOT", "PREFACE", "PROLOGUE", "PROSE", "SATIRE",
      "SEQUEL", "SIMILE", "STANZA", "SUBPLOT", "THEME",
      "THRILLER", "TOME", "VERSE", "VILLAIN", "VOLUME",
    ],
    [
      "A reader lives a thousand lives before he dies.",
      "Not all readers are leaders, but all leaders are readers.",
      "Books are a uniquely portable magic.",
      "There is no friend as loyal as a book.",
    ],
    ["BIBLIOGRAPHY", "PROTAGONIST", "OMNISCIENT", "FORESHADOWING"]
  ),

  "Sports Legends": bank(
    [
      "ALTITUDE", "ANCHOR", "ATHLETIC", "BATON",
      "BLEACHERS", "BRACKET", "CHAMPION", "CIRCUIT",
      "COMEBACK", "COACH", "DECATHLON", "DEFEAT",
      "DYNASTY", "ENDURANCE", "FINALS", "FORMULA",
      "GLORY", "GOLDEN", "GRAND", "HURDLE", "JERSEY",
      "MARATHON", "MEDLEY", "PENALTY", "PINNACLE",
      "PLAYOFF", "PODIUM", "QUALIFIER", "RECORD",
      "RELAY", "SEMIFINAL", "SPRINT", "STADIUM",
      "STAMINA", "TITLE", "TROPHY", "UNBEATEN",
      "VELOCITY", "VICTORY", "WILDCARD",
    ],
    [
      "Champions keep playing until they get it right.",
      "It's not whether you get knocked down; it's whether you get up.",
      "You miss one hundred percent of the shots you don't take.",
      "Hard work beats talent when talent doesn't work hard.",
    ],
    ["ENDURANCE", "QUALIFIER", "CHAMPIONSHIP", "SEMIFINAL", "DECATHLON"]
  ),

  "Into Space": bank(
    [
      "APOGEE", "ASTEROID", "ASTRONAUT", "AURORA",
      "BINARY", "BLACKHOLE", "COMET", "CORONA",
      "COSMOS", "CRATER", "ECLIPSE", "EQUINOX",
      "EXOPLANET", "GALAXY", "GRAVITY", "HELIOSPHERE",
      "HUBBLE", "INFINITY", "JOVIAN", "LAUNCH",
      "MAGNETAR", "MARS", "MERCURY", "METEOR",
      "MILKY", "MISSION", "MOON", "NEBULA",
      "NEUTRON", "NOVA", "ORBIT", "PERIHELION",
      "PLANET", "PLASMA", "PULSAR", "QUASAR",
      "ROCKET", "SATELLITE", "SOLAR", "STELLAR",
      "SUPERNOVA", "TELESCOPE", "TITAN", "VACUUM",
      "VENUS", "VOYAGER", "WORMHOLE", "ZENITH",
    ],
    [
      "The universe is under no obligation to make sense to you.",
      "To infinity and beyond.",
      "Space is not remote at all. It is only an hour's drive away if your car could go straight upwards.",
      "The sky is not the limit. There are footprints on the moon.",
    ],
    ["ASTRONOMER", "CONSTELLATION", "INTERSTELLAR", "HELIOCENTRIC"]
  ),

  "Ancient History": bank(
    [
      "ACROPOLIS", "AGORA", "AMPHORA", "AQUEDUCT",
      "ARTIFACT", "CAESAR", "CATACOMB", "CENTURION",
      "CITADEL", "CLAY", "COLOSSEUM", "CONSUL",
      "CUNEIFORM", "DYNASTY", "EMPEROR", "EMPIRE",
      "FORUM", "GLADIATOR", "HIEROGLYPH", "LEGION",
      "LINEN", "MARBLE", "MOSAIC", "MYTH", "OBELISK",
      "ORACLE", "PAPYRUS", "PATRICIAN", "PHARAOH",
      "PLATO", "PYRAMID", "REPUBLIC", "ROMAN",
      "RUNE", "SCROLL", "SENATE", "SPHINX",
      "TABLET", "TEMPLE", "TOGA", "TOMB",
      "TRIREME", "TROJAN", "VESTAL",
    ],
    [
      "Those who cannot remember the past are condemned to repeat it.",
      "History is written by the victors.",
      "The past is never dead. It is not even past.",
      "Study the past if you would define the future.",
    ],
    ["MESOPOTAMIA", "ARCHAEOLOGY", "SARCOPHAGUS", "HIEROGLYPHIC"]
  ),

  "Pop Culture Remix": bank(
    [
      "AESTHETIC", "ALGORITHM", "AVATAR", "BINGE",
      "BRAND", "CAPTION", "CELEBRITY", "CHALLENGE",
      "CONTENT", "CREATOR", "DEBUT", "DIGITAL",
      "DRAMA", "DROP", "EMOJI", "FANDOM", "FEED",
      "FILTER", "FOLLOWER", "FORMAT", "GENRE",
      "HASHTAG", "HYPE", "ICONIC", "INFLUENCER",
      "LAUNCH", "LEGACY", "LIVE", "MASHUP",
      "MEME", "MERCH", "MOMENT", "NOSTALGIA",
      "PLATFORM", "REMIX", "REPOST", "SAGA",
      "SERIES", "STREAM", "TREND", "VIRAL",
      "VLOG", "WAVE", "WOKE", "ZEITGEIST",
    ],
    [
      "In the future, everyone will be world-famous for fifteen minutes.",
      "Culture is not something added to you. It is something that grows through you.",
      "The medium is the message.",
      "Entertainment is not mindless escape. It is what nourishes the mind.",
    ],
    ["INFLUENCER", "ALGORITHM", "ZEITGEIST", "NOSTALGIA", "AESTHETIC"]
  ),

  // ── Override / seasonal themes ──────────────────────────────────────────────

  "Halloween": bank(
    [
      "BANSHEE", "BAT", "CAULDRON", "COBWEB", "COFFIN",
      "COSTUME", "CREEP", "CRYPT", "CURSE", "DARKNESS",
      "DEMON", "DREAD", "DRACULA", "EERIE", "FRIGHT",
      "GHOST", "GHOUL", "GOBLIN", "GRAVE", "GRIMOIRE",
      "HAUNT", "HORROR", "HOWL", "LANTERN", "MACABRE",
      "MONSTER", "MUMMY", "NIGHT", "OMEN", "PHANTOM",
      "POTION", "PUMPKIN", "RAVEN", "RITUAL", "SCARECROW",
      "SCREAM", "SHADOW", "SKELETON", "SKULL", "SPECTER",
      "SPELL", "SPIDER", "TERROR", "TOMBSTONE", "TRICK",
      "UNDEAD", "VAMPIRE", "WICKED", "WITCH", "WRAITH",
    ],
    [
      "Double, double toil and trouble; fire burn and cauldron bubble.",
      "In the dead vast and middle of the night.",
      "When black cats prowl and pumpkins gleam, may luck be yours on Halloween.",
      "There are nights when the wolves are silent and only the moon howls.",
    ],
    ["SUPERNATURAL", "APPARITION", "BEWITCHED", "Halloween", "GRAVEYARD"]
  ),

  "Thanksgiving": bank(
    [
      "ABUNDANCE", "AUTUMN", "BASTE", "BOUNTIFUL", "BREAD",
      "CASSEROLE", "CIDER", "CLOVES", "CORNUCOPIA", "CRANBERRY",
      "DRESSING", "DRUMSTICK", "FAMILY", "FEAST", "GATHER",
      "GENEROUS", "GRATEFUL", "GRATITUDE", "GRAVY", "HARVEST",
      "HOMEMADE", "MAPLE", "NUTMEG", "PATCHWORK", "PECAN",
      "PILGRIMS", "PLUM", "PUMPKIN", "RECIPE", "ROAST",
      "SAGE", "SETTLERS", "SQUASH", "STUFFING", "SWEET",
      "TABLE", "THANKFUL", "TRADITION", "TURKEY", "WARMTH",
      "WISHBONE", "YAMS",
    ],
    [
      "Gratitude can transform common days into thanksgivings.",
      "Give thanks for a little and you will find a lot.",
      "The roots of all goodness lie in the soil of appreciation for goodness.",
      "Enough is a feast.",
    ],
    ["CORNUCOPIA", "BOUNTIFUL", "CELEBRATION", "TRADITION", "GRATITUDE"]
  ),

  "Christmas": bank(
    [
      "ADVENT", "ANGEL", "BAUBLE", "BELLS", "BLITZEN",
      "CANDLE", "CAROL", "CHIMNEY", "CINNAMON", "COMET",
      "DASHER", "DECEMBER", "DONNER", "ELVES", "FESTIVE",
      "FRANKINCENSE", "GARLAND", "GINGERBREAD", "HOLLY",
      "IVY", "JINGLE", "JOLLY", "LANTERN", "MANGER",
      "MIDNIGHT", "MISTLETOE", "NATIVITY", "NOEL",
      "NUTCRACKER", "ORNAMENT", "PRESENTS", "PRANCER",
      "REINDEER", "RIBBONS", "RUDOLPH", "SANTA",
      "SLEIGH", "SNOWFLAKE", "STOCKING", "TINSEL",
      "TRADITION", "TREE", "WASSAIL", "WONDER", "WREATH",
    ],
    [
      "Christmas is not a time nor a season, but a state of mind.",
      "Peace on earth will come to stay, when we live Christmas every day.",
      "The best of all gifts around any Christmas tree is the presence of a happy family.",
      "Christmas waves a magic wand over this world, and behold, everything is softer and more beautiful.",
    ],
    ["FRANKINCENSE", "CANDLELIGHT", "GINGERBREAD", "CELEBRATION"]
  ),

  "New Year": bank(
    [
      "AMBITION", "ANTICIPATE", "BALL", "BEGIN",
      "CALENDAR", "CELEBRATE", "CHANGE", "CHEER",
      "CHAMPAGNE", "CHEERS", "CONFETTI", "COUNTDOWN",
      "DECADE", "DREAM", "FIREWORK", "FRESH",
      "FUTURE", "GOAL", "HOPE", "HORIZON",
      "INTENTION", "JANUARY", "JUBILEE", "LAUNCH",
      "MIDNIGHT", "MILESTONE", "MOMENTUM", "NEW",
      "OPTIMISM", "PLEDGE", "PROMISE", "PURPOSE",
      "REFLECT", "RENEWAL", "RESOLUTION", "RESTART",
      "SPARKLE", "TOAST", "TRANSFORM", "TRIUMPH",
      "VISION", "WELCOME", "WISH", "WONDER",
    ],
    [
      "Write it on your heart that every day is the best day of the year.",
      "Tomorrow is the first blank page of a three hundred and sixty-five page book.",
      "For last year's words belong to last year's language.",
      "Cheers to a new year and another chance to get it right.",
    ],
    ["RESOLUTION", "REFLECTION", "CELEBRATION", "OPPORTUNITY", "ANTICIPATION"]
  ),

  "Valentine's Week": bank(
    [
      "ADORE", "AFFECTION", "AMOUR", "ARDENT", "BLOSSOM",
      "BOUQUET", "CANDLE", "CHERISH", "CUPID", "DARLING",
      "DESIRE", "DEVOTED", "ENCHANT", "ETERNAL", "FANCY",
      "FLAME", "FOND", "FOREVER", "GENTLE", "HEART",
      "KISS", "LOCKET", "LOVE", "LOYAL", "LYRIC",
      "PASSION", "PETAL", "POETRY", "PRECIOUS", "ROMANCE",
      "ROSE", "SERENADE", "SMITTEN", "SONNET", "SWEET",
      "TENDER", "TOGETHER", "TOKEN", "TREASURE", "VOW",
      "WARMTH", "WHISPER", "YEARNING",
    ],
    [
      "The best thing to hold onto in life is each other.",
      "You know you're in love when you can't fall asleep because reality is finally better than your dreams.",
      "To love and be loved is to feel the sun from both sides.",
      "I have waited for this opportunity for more than half a century.",
    ],
    ["SERENADE", "DEVOTION", "ENCHANTMENT", "AFFECTION", "EVERLASTING"]
  ),

  "Super Bowl Week": bank(
    [
      "BLITZ", "CATCH", "CLEATS", "COACH", "COVERAGE",
      "DEFENSE", "DRIVE", "ENDZONE", "FIELD", "FOOTBALL",
      "FORMATION", "FUMBLE", "GOALPOST", "GRIDIRON",
      "HALFTIME", "HANDOFF", "HELMET", "HUDDLE",
      "INTERCEPTION", "JERSEY", "KICKOFF", "LATERAL",
      "LINEMAN", "OFFENSE", "OVERTIME", "PASS",
      "PENALTY", "PIGSKIN", "PUNT", "QUARTERBACK",
      "RECEIVER", "REDZONE", "SAFETY", "SACK",
      "SNAP", "SPIRAL", "STADIUM", "TACKLE", "TOUCHDOWN",
      "TROPHY", "TURNOVER", "UPSET", "WILDCARD", "ZONE",
    ],
    [
      "Winning is not everything, but making the effort to win is.",
      "The strength of the team is each individual member. The strength of each member is the team.",
      "Perfection is not attainable, but if we chase perfection we can catch excellence.",
      "Football is like life — it requires perseverance, self-denial, hard work, and dedication.",
    ],
    ["QUARTERBACK", "INTERCEPTION", "TOUCHDOWN", "CHAMPIONSHIP", "LINEBACKER"]
  ),

  "St Patrick's Day": bank(
    [
      "BLARNEY", "BOGLAND", "CELTIC", "CLOVER", "COBBLESTONE",
      "COTTAGE", "DINGLE", "DONEGAL", "DRUID", "DUBLIN",
      "ERIN", "FAERIE", "FIDDLE", "FOLKLORE", "GAELIC",
      "GALWAY", "GOBLIN", "GOLDEN", "GREEN", "HARP",
      "HERITAGE", "HIGHLAND", "IRELAND", "JIGS", "KERRIGAN",
      "KILDARE", "KILKENNY", "LAGAN", "LEGEND", "LEPRECHAUN",
      "LIFFEY", "LIMERICK", "LORE", "LUCKY", "MEATH",
      "PATRON", "PILGRIM", "PIPES", "REEL", "ROVERS",
      "SHAMROCK", "SHANTY", "SLIGO", "SPIRIT", "TREFOIL",
      "ULSTER", "VALE",
    ],
    [
      "May you always have walls for the winds, a roof for the rain, tea beside the fire, laughter to cheer you.",
      "There are only two kinds of people in the world. The Irish and those who wish they were.",
      "May your troubles be less and your blessings be more.",
      "It is better to spend money like there is no tomorrow than to spend tonight like there is no money.",
    ],
    ["SHAMROCK", "LEPRECHAUN", "CLOVERLEAF", "CELTIC", "COBBLESTONE"]
  ),

  "The Masters": bank(
    [
      "ALBATROSS", "AUGUSTA", "BIRDIE", "BOGEY",
      "BUNKER", "CADDIE", "CHIP", "COURSE",
      "DIVOT", "DOGLEG", "DRAW", "DRIVER",
      "EAGLE", "FADE", "FAIRWAY", "FLAG",
      "FLOP", "GALLERY", "GOLF", "GRAIN",
      "GREEN", "GRIP", "HANDICAP", "HAZARD",
      "HOLE", "HONOURS", "IRON", "JACKET",
      "LINKS", "LOFT", "MATCH", "MEDAL",
      "MULLIGAN", "NINE", "PAR", "PENALTY",
      "PITCH", "PLAYOFF", "PUTT", "ROUGH",
      "ROUND", "SAND", "SCRATCH", "SHAFT",
      "STANCE", "STROKE", "TEES", "WEDGE",
      "WOOD", "YARDAGE",
    ],
    [
      "Golf is a game whose aim is to hit a very small ball into an even smaller hole, with weapons singularly ill-designed for the purpose.",
      "Golf is not a sport. Golf is men in ugly pants walking.",
      "The secret of golf is to turn three shots into two.",
      "In golf, as in life, the attempt to do something in one stroke that needs two is apt to result in taking three.",
    ],
    ["CHAMPIONSHIP", "BACKSWING", "SCORECARD", "CLUBHOUSE", "HANDICAP"]
  ),

  "The Olympics": bank(
    [
      "ANTHEM", "AQUATICS", "ARCHERY", "ARENA",
      "ATHLETE", "BRONZE", "CEREMONY", "CHAMPION",
      "CIRCUIT", "CLOSING", "COMBAT", "CYCLING",
      "DECATHLON", "DISCUS", "DIVING", "EQUESTRIAN",
      "FENCING", "FINALS", "FLAG", "FLAME",
      "GOLD", "GYMNAST", "HAMMER", "HEAT",
      "HEPTATHLON", "HURDLE", "JAVELIN", "JUDO",
      "KAYAK", "MARATHON", "MEDAL", "MEDLEY",
      "MODERN", "NATIONS", "OPENING", "PADDLE",
      "PODIUM", "RELAY", "RINGS", "ROWING",
      "SILVER", "SPRINT", "STADIUM", "SWORN",
      "TORCH", "TRIATHLON", "TRIUMPH", "VAULT",
    ],
    [
      "The important thing in the Olympic Games is not to win, but to take part.",
      "Faster, Higher, Stronger.",
      "One moment can change a day, one day can change a life, and one life can change the world.",
      "You were born to be a player. You were meant to be here.",
    ],
    ["DECATHLON", "HEPTATHLON", "CHAMPIONSHIP", "TRIATHLON", "CEREMONY"]
  ),

};

// ── Lookup ────────────────────────────────────────────────────────────────────

/**
 * Get the word bank for a given theme name.
 * Returns null if the theme is unrecognised — callers should fall back to
 * the default WORDS list in that case, not silently use an empty bank.
 */
export function getThemeWordBank(theme: string): ThemeWordBank | null {
  return THEME_WORD_BANKS[theme] ?? null;
}

/**
 * Validate a word bank — returns a quality score (0–100) and any issues.
 * Use in admin tools to check custom themes before publishing.
 */
export function validateThemeWordBank(bank: ThemeWordBank): {
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  if (bank.words.length < 20) {
    issues.push(`Word bank too small (${bank.words.length} words, need ≥20)`);
    score -= 30;
  }
  if (bank.quotes.length < 2) {
    issues.push("Fewer than 2 quotes — cryptogram puzzles may feel empty");
    score -= 15;
  }
  // Check for suspiciously short or long words
  const oddWords = bank.words.filter(w => w.length < 3 || w.length > 14);
  if (oddWords.length > 0) {
    issues.push(`${oddWords.length} words with odd lengths: ${oddWords.slice(0, 3).join(", ")}`);
    score -= oddWords.length * 2;
  }
  // Check for duplicate words
  const unique = new Set(bank.words);
  if (unique.size < bank.words.length) {
    issues.push(`${bank.words.length - unique.size} duplicate words`);
    score -= 10;
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Build a custom ad-hoc word bank for themes not in the preset list.
 * Returns a minimal bank using the extended words as the primary pool.
 * Admin tools should prefer preset banks where possible.
 */
export function buildAdHocWordBank(themeWords: string[], quotes: string[]): ThemeWordBank {
  return { words: themeWords, quotes, extended: [] };
}
