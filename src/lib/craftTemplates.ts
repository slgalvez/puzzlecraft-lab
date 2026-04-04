/**
 * craftTemplates.ts
 * Pre-populated word/clue sets for common occasions.
 * Shown in CraftPuzzle Step 1 as a "Start from a template" option.
 */

export interface CraftTemplate {
  id: string;
  label: string;
  emoji: string;
  compatibleTypes: Array<"crossword" | "word-search" | "word-fill" | "cryptogram">;
  words: string[];
  clues?: Record<string, string>;
  phrase?: string;
  description: string;
}

export const CRAFT_TEMPLATES: CraftTemplate[] = [
  {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    compatibleTypes: ["crossword", "word-search", "word-fill"],
    words: ["BIRTHDAY", "CELEBRATE", "CANDLES", "WISHES", "PARTY", "CAKE", "FRIENDS", "SURPRISE", "GIFT", "JOY"],
    clues: {
      BIRTHDAY: "The day you came into the world",
      CELEBRATE: "What we're doing for you today",
      CANDLES: "Make a wish before blowing these out",
      CAKE: "The essential birthday treat",
      SURPRISE: "What this puzzle might be",
    },
    phrase: "Another year older, another year wiser, another year more amazing.",
    description: "Perfect for sending a personalized birthday puzzle",
  },
  {
    id: "anniversary",
    label: "Anniversary",
    emoji: "💍",
    compatibleTypes: ["crossword", "word-search", "word-fill", "cryptogram"],
    words: ["LOVE", "TOGETHER", "YEARS", "MEMORIES", "FOREVER", "JOURNEY", "DEVOTED", "CHERISH", "COMMITMENT", "CELEBRATE"],
    clues: {
      LOVE: "The reason we're celebrating",
      TOGETHER: "How we do everything",
      FOREVER: "How long this will last",
      CHERISH: "What we do with these memories",
    },
    phrase: "Every love story is beautiful, but ours is my favourite.",
    description: "Celebrate a milestone together",
  },
  {
    id: "graduation",
    label: "Graduation",
    emoji: "🎓",
    compatibleTypes: ["crossword", "word-search", "word-fill"],
    words: ["GRADUATE", "DIPLOMA", "ACHIEVEMENT", "FUTURE", "SUCCESS", "PROUD", "HARDWORK", "KNOWLEDGE", "CEREMONY", "CELEBRATE"],
    clues: {
      GRADUATE: "What you officially are now",
      DIPLOMA: "Your hard-earned certificate",
      ACHIEVEMENT: "Everything you've accomplished",
      FUTURE: "What's ahead of you",
      PROUD: "How everyone feels about you",
    },
    description: "Honour someone's big achievement",
  },
  {
    id: "new_year",
    label: "New Year",
    emoji: "🎉",
    compatibleTypes: ["crossword", "word-search", "word-fill", "cryptogram"],
    words: ["RESOLUTION", "CELEBRATE", "COUNTDOWN", "FIREWORKS", "CHAMPAGNE", "MIDNIGHT", "FRESH", "GOALS", "CHEERS", "RENEWAL"],
    clues: {
      RESOLUTION: "Your promise to yourself",
      COUNTDOWN: "Ten, nine, eight...",
      FIREWORKS: "Light up the sky",
      MIDNIGHT: "When it all begins",
    },
    phrase: "Cheers to a new year and another chance to get it right.",
    description: "Ring in the new year with a puzzle",
  },
  {
    id: "friendship",
    label: "Best Friends",
    emoji: "🫂",
    compatibleTypes: ["crossword", "word-search", "word-fill", "cryptogram"],
    words: ["LOYALTY", "LAUGHTER", "MEMORIES", "SUPPORT", "TRUST", "ADVENTURE", "HONEST", "KINDNESS", "FOREVER", "TOGETHER"],
    clues: {
      LOYALTY: "Always in your corner",
      LAUGHTER: "The best medicine, especially with you",
      TRUST: "The foundation of everything",
      ADVENTURE: "What we always find together",
    },
    phrase: "Good friends are hard to find, harder to leave, and impossible to forget.",
    description: "Celebrate your friendship",
  },
  {
    id: "valentines",
    label: "Valentine's Day",
    emoji: "❤️",
    compatibleTypes: ["crossword", "word-search", "word-fill", "cryptogram"],
    words: ["SWEETHEART", "ROMANCE", "ADORE", "DEVOTED", "PASSION", "DARLING", "FOREVER", "SOULMATE", "CHERISH", "BELOVED"],
    clues: {
      SWEETHEART: "What I call you",
      ADORE: "What I do every time I see you",
      SOULMATE: "That's what you are to me",
      CHERISH: "Every moment with you",
    },
    phrase: "You are my today and all of my tomorrows.",
    description: "Send love in puzzle form",
  },
  {
    id: "thank_you",
    label: "Thank You",
    emoji: "🙏",
    compatibleTypes: ["crossword", "word-search", "word-fill", "cryptogram"],
    words: ["GRATEFUL", "APPRECIATE", "THANKFUL", "GENEROUS", "KINDNESS", "THOUGHTFUL", "BLESSED", "HEARTFELT", "WONDERFUL", "SUPPORT"],
    clues: {
      GRATEFUL: "Exactly how I feel",
      APPRECIATE: "Everything you do",
      THOUGHTFUL: "How you always are",
      HEARTFELT: "What this thank-you is",
    },
    phrase: "Gratitude turns what we have into enough.",
    description: "Say thank you in a memorable way",
  },
  {
    id: "movies",
    label: "Movie Night",
    emoji: "🎬",
    compatibleTypes: ["crossword", "word-search", "word-fill"],
    words: ["POPCORN", "BLOCKBUSTER", "DIRECTOR", "SCREENPLAY", "THRILLER", "COMEDY", "CLIMAX", "SEQUEL", "PREMIERE", "CREDITS"],
    clues: {
      POPCORN: "The essential movie snack",
      BLOCKBUSTER: "A massive hit film",
      DIRECTOR: "They call the shots",
      CLIMAX: "The most exciting moment",
      CREDITS: "Roll when it's over",
    },
    description: "Perfect for film buffs",
  },
  {
    id: "travel",
    label: "Adventure",
    emoji: "✈️",
    compatibleTypes: ["crossword", "word-search", "word-fill"],
    words: ["EXPLORE", "PASSPORT", "WANDERLUST", "DESTINATION", "JOURNEY", "DISCOVERY", "ADVENTURE", "HORIZON", "CULTURE", "MEMORIES"],
    clues: {
      EXPLORE: "What adventurers love to do",
      PASSPORT: "Your ticket to the world",
      WANDERLUST: "The urge to roam",
      HORIZON: "Always something beyond it",
    },
    description: "For the traveller in your life",
  },
  {
    id: "sports",
    label: "Sports Fan",
    emoji: "🏆",
    compatibleTypes: ["crossword", "word-search", "word-fill"],
    words: ["CHAMPION", "VICTORY", "TEAMWORK", "STADIUM", "COMPETE", "TRAINING", "TROPHY", "PLAYOFFS", "STRATEGY", "DEDICATED"],
    clues: {
      CHAMPION: "What every team wants to be",
      VICTORY: "The taste of winning",
      TEAMWORK: "Makes the dream work",
      TROPHY: "The ultimate prize",
    },
    description: "For the sports obsessive",
  },
  {
    id: "custom",
    label: "Start from scratch",
    emoji: "✏️",
    compatibleTypes: ["crossword", "word-search", "word-fill", "cryptogram"],
    words: [],
    description: "Use your own words and clues",
  },
];

export function getTemplatesForType(
  type: "crossword" | "word-search" | "word-fill" | "cryptogram"
): CraftTemplate[] {
  return CRAFT_TEMPLATES.filter((t) => t.compatibleTypes.includes(type));
}

export function getTemplateById(id: string): CraftTemplate | undefined {
  return CRAFT_TEMPLATES.find((t) => t.id === id);
}
