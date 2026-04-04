/**
 * Puzzlecraft Craft Themes
 *
 * Themes personalize the puzzle-solving experience for the recipient.
 * Each theme provides:
 *  - A display emoji shown on the solve page header
 *  - An accent color (HSL values matching Tailwind/CSS vars pattern)
 *  - A category label
 *  - Pre-written reveal message templates the creator can use
 *  - Word suggestions to inspire their puzzle content
 */

export interface CraftTheme {
  id: string;
  label: string;
  emoji: string;
  /** HSL values for accent color — e.g. "340 80% 55%" */
  accentHsl: string;
  /** HSL values for accent background — lighter tint */
  accentBgHsl: string;
  revealTemplates: string[];
  wordSuggestions: string[];
}

export const CRAFT_THEMES: CraftTheme[] = [
  {
    id: "none",
    label: "No theme",
    emoji: "🧩",
    accentHsl: "32 80% 50%",
    accentBgHsl: "32 80% 96%",
    revealTemplates: [],
    wordSuggestions: [],
  },
  {
    id: "birthday",
    label: "Birthday 🎂",
    emoji: "🎂",
    accentHsl: "340 80% 55%",
    accentBgHsl: "340 80% 96%",
    revealTemplates: [
      "Happy Birthday! Hope this puzzle made you smile 🎉",
      "Wishing you a day as wonderful as you are. Happy Birthday! 🎂",
      "Another year older, another puzzle solved! Congrats 🥳",
    ],
    wordSuggestions: ["BIRTHDAY", "CELEBRATE", "CANDLES", "CAKE", "WISHES", "PARTY", "CONFETTI", "BALLOONS", "SURPRISE", "FRIENDS"],
  },
  {
    id: "anniversary",
    label: "Anniversary 💑",
    emoji: "💑",
    accentHsl: "350 75% 55%",
    accentBgHsl: "350 75% 96%",
    revealTemplates: [
      "Happy Anniversary! Every year with you is a gift 💕",
      "Here's to another year of adventures together ✨",
      "You're still my favorite puzzle to solve 💑",
    ],
    wordSuggestions: ["LOVE", "TOGETHER", "FOREVER", "MEMORIES", "ADVENTURE", "JOURNEY", "LAUGHTER", "CHERISH", "DEVOTION", "SOULMATE"],
  },
  {
    id: "travel",
    label: "Travel ✈️",
    emoji: "✈️",
    accentHsl: "200 80% 45%",
    accentBgHsl: "200 80% 95%",
    revealTemplates: [
      "Bon voyage! Can't wait to hear all about it ✈️",
      "Adventure awaits — go get it! 🌍",
      "Wishing you safe travels and amazing stories to tell 🗺️",
    ],
    wordSuggestions: ["ADVENTURE", "PASSPORT", "EXPLORE", "JOURNEY", "HORIZON", "WANDER", "DISCOVER", "CULTURE", "SUITCASE", "DEPARTURE"],
  },
  {
    id: "congrats",
    label: "Congratulations 🏆",
    emoji: "🏆",
    accentHsl: "45 90% 48%",
    accentBgHsl: "45 90% 95%",
    revealTemplates: [
      "Congratulations! You absolutely crushed it 🏆",
      "So proud of everything you've achieved! Well done 🌟",
      "You worked hard for this — now celebrate! 🎊",
    ],
    wordSuggestions: ["ACHIEVE", "SUCCESS", "VICTORY", "CHAMPION", "PROUD", "MILESTONE", "TRIUMPH", "BRILLIANT", "WINNER", "DESERVE"],
  },
  {
    id: "holiday",
    label: "Holiday 🎄",
    emoji: "🎄",
    accentHsl: "140 60% 40%",
    accentBgHsl: "140 60% 95%",
    revealTemplates: [
      "Wishing you a magical holiday season 🎄",
      "May your days be merry and bright ⭐",
      "Happy holidays — hope this puzzle brought some cheer! 🎁",
    ],
    wordSuggestions: ["WINTER", "SNOWFLAKE", "FESTIVE", "GATHER", "TRADITION", "COZY", "TINSEL", "REINDEER", "MIDNIGHT", "JOYFUL"],
  },
  {
    id: "friendship",
    label: "Friendship 💛",
    emoji: "💛",
    accentHsl: "45 95% 50%",
    accentBgHsl: "45 95% 95%",
    revealTemplates: [
      "Made this just for you because you're the best 💛",
      "Friends like you make everything better 🌻",
      "This one's for you — my favorite person ✨",
    ],
    wordSuggestions: ["TOGETHER", "LAUGHTER", "MEMORIES", "LOYALTY", "KINDNESS", "SUPPORT", "SUNSHINE", "BESTIE", "FOREVER", "GRATEFUL"],
  },
  {
    id: "romance",
    label: "Romance 💌",
    emoji: "💌",
    accentHsl: "350 80% 55%",
    accentBgHsl: "350 80% 96%",
    revealTemplates: [
      "Made this with love, just for you 💌",
      "Every word in this puzzle made me think of you ❤️",
      "You're my favorite adventure 💕",
    ],
    wordSuggestions: ["DARLING", "TREASURE", "DEVOTION", "PASSION", "ADORE", "BLOSSOM", "ETERNAL", "HEARTBEAT", "DREAM", "ENCHANTED"],
  },
  {
    id: "graduation",
    label: "Graduation 🎓",
    emoji: "🎓",
    accentHsl: "260 60% 55%",
    accentBgHsl: "260 60% 96%",
    revealTemplates: [
      "You did it! So incredibly proud of you 🎓",
      "The tassel was worth the hassle! Congratulations 🌟",
      "The next chapter starts now — go make it amazing 📖",
    ],
    wordSuggestions: ["GRADUATE", "DIPLOMA", "FUTURE", "ACHIEVE", "SCHOLAR", "KNOWLEDGE", "CAMPUS", "CEREMONY", "CHAPTER", "ASPIRE"],
  },
  {
    id: "baby",
    label: "New Baby 🍼",
    emoji: "🍼",
    accentHsl: "200 70% 60%",
    accentBgHsl: "200 70% 95%",
    revealTemplates: [
      "Welcome to the world, little one! 🍼",
      "A new adventure begins — so happy for your family 💙",
      "The tiniest feet make the biggest footprints 👶",
    ],
    wordSuggestions: ["WELCOME", "PRECIOUS", "MIRACLE", "TINY", "BUNDLE", "GIGGLE", "SLEEPY", "NURSERY", "ADVENTURE", "CHERISH"],
  },
  {
    id: "movienite",
    label: "Movie Night 🎬",
    emoji: "🎬",
    accentHsl: "260 50% 50%",
    accentBgHsl: "260 50% 96%",
    revealTemplates: [
      "Popcorn's ready — puzzle solved! 🍿",
      "Lights, camera, action! Now let's watch 🎬",
      "You cracked the code. Movie time! 🎥",
    ],
    wordSuggestions: ["CINEMA", "POPCORN", "CLASSIC", "DIRECTOR", "SEQUEL", "TRAILER", "PREMIERE", "BLOCKBUSTER", "CREDITS", "SUSPENSE"],
  },
];

/** Get a theme by ID, falling back to the "none" theme */
export function getTheme(id: string | undefined): CraftTheme {
  return CRAFT_THEMES.find((t) => t.id === id) ?? CRAFT_THEMES[0];
}

/** CSS inline style object for applying a theme accent on the solve page */
export function themeAccentStyle(theme: CraftTheme): React.CSSProperties {
  return {
    ["--craft-accent" as string]: theme.accentHsl,
    ["--craft-accent-bg" as string]: theme.accentBgHsl,
  };
}
