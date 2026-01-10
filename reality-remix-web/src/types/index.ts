/**
 * Type definitions for The Reality Remix web app
 */

export const Genre = {
  NATURE_DOCUMENTARY: "nature_documentary",
  SPORTS: "sports",
  THRILLER: "thriller",
  ROMCOM: "romcom",
  HORROR: "horror",
  COOKING: "cooking",
  SCIENCE: "science",
  REALITY_TV: "reality_tv",
  TIME_TRAVELER: "time_traveler_historian",
  GENZ: "genz_slang",
  CORPORATE: "corporate_consultant",
  ACADEMIC: "overly_serious_academic",
  MUSICAL: "musical_narrator",
  ANIME: "anime_narrator",
  STANDUP: "standup_comedian",
  SINGAPOREAN: "singaporean",
  SUNDAR_PICHAI: "sundar_pichai",
} as const;

export type Genre = (typeof Genre)[keyof typeof Genre];

export interface GenreInfo {
  id: Genre;
  name: string;
  description: string;
  icon: string;
}

export const WebSocketMessageType = {
  SESSION_START: "session_start",
  FRAME: "frame",
  GENRE_CHANGE: "genre_change",
  AUDIO_CHUNK: "audio_chunk",
  MUSIC_CHUNK: "music_chunk",
  TURN_COMPLETE: "turn_complete",
  ERROR: "error",
  SESSION_STOP: "session_stop",
  TRANSCRIPTION: "transcription",
  MUSIC_TOGGLE: "music_toggle",
} as const;

export type WebSocketMessageType =
  (typeof WebSocketMessageType)[keyof typeof WebSocketMessageType];

export interface SessionStartMessage {
  type: typeof WebSocketMessageType.SESSION_START;
  genre: Genre;
  fps: number;
  enable_music?: boolean;
}

export interface FrameMessage {
  type: typeof WebSocketMessageType.FRAME;
  data: string; // base64 JPEG
  timestamp: number;
}

export interface GenreChangeMessage {
  type: typeof WebSocketMessageType.GENRE_CHANGE;
  genre: Genre;
}

export interface SessionStopMessage {
  type: typeof WebSocketMessageType.SESSION_STOP;
}

export interface AudioChunkMessage {
  type: typeof WebSocketMessageType.AUDIO_CHUNK;
  data: string; // base64 PCM audio
  timestamp: number;
}

export interface TurnCompleteMessage {
  type: typeof WebSocketMessageType.TURN_COMPLETE;
}

export interface ErrorMessage {
  type: typeof WebSocketMessageType.ERROR;
  message: string;
  code?: string;
}

export interface MusicChunkMessage {
  type: typeof WebSocketMessageType.MUSIC_CHUNK;
  data: string; // base64 audio
  timestamp: number;
}

export interface MusicToggleMessage {
  type: typeof WebSocketMessageType.MUSIC_TOGGLE;
  enabled: boolean;
}

export type ClientMessage =
  | SessionStartMessage
  | FrameMessage
  | GenreChangeMessage
  | SessionStopMessage
  | MusicToggleMessage;

export type ServerMessage =
  | AudioChunkMessage
  | MusicChunkMessage
  | TurnCompleteMessage
  | ErrorMessage
  | TranscriptionMessage;

export const ConnectionStatus = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export type ConnectionStatus =
  (typeof ConnectionStatus)[keyof typeof ConnectionStatus];

export const GENRE_INFO: Record<Genre, GenreInfo> = {
  [Genre.NATURE_DOCUMENTARY]: {
    id: Genre.NATURE_DOCUMENTARY,
    name: "Nature Documentary",
    description: "David Attenborough-style narration",
    icon: "🌿",
  },
  [Genre.SPORTS]: {
    id: Genre.SPORTS,
    name: "Sports Commentary",
    description: "High-energy play-by-play",
    icon: "🏆",
  },
  [Genre.THRILLER]: {
    id: Genre.THRILLER,
    name: "Thriller",
    description: "Film noir suspense",
    icon: "🕵️",
  },
  [Genre.ROMCOM]: {
    id: Genre.ROMCOM,
    name: "Romantic Comedy",
    description: "Witty rom-com observations",
    icon: "💕",
  },
  [Genre.HORROR]: {
    id: Genre.HORROR,
    name: "Horror",
    description: "Ominous narration",
    icon: "😱",
  },
  [Genre.COOKING]: {
    id: Genre.COOKING,
    name: "Cooking Show",
    description: "Enthusiastic chef",
    icon: "👨‍🍳",
  },
  [Genre.SCIENCE]: {
    id: Genre.SCIENCE,
    name: "Science Documentary",
    description: "Educational exploration",
    icon: "🔬",
  },
  [Genre.REALITY_TV]: {
    id: Genre.REALITY_TV,
    name: "Reality TV",
    description: "Dramatic commentary",
    icon: "📺",
  },
  [Genre.TIME_TRAVELER]: {
    id: Genre.TIME_TRAVELER,
    name: "Time Traveler Historian",
    description: "Narrates as if this moment is historically significant.",
    icon: "🕰️",
  },
  [Genre.GENZ]: {
    id: Genre.GENZ,
    name: "Gen‑Z Slang Mode",
    description: "Lowkey iconic — short, slangy commentary.",
    icon: "🗣️",
  },
  [Genre.CORPORATE]: {
    id: Genre.CORPORATE,
    name: "Corporate Consultant",
    description: "Dry corporate analysis of everyday actions.",
    icon: "📉",
  },
  [Genre.ACADEMIC]: {
    id: Genre.ACADEMIC,
    name: "Overly Serious Academic",
    description: "Treats mundane scenes like peer‑reviewed research.",
    icon: "🧑‍🏫",
  },
  [Genre.MUSICAL]: {
    id: Genre.MUSICAL,
    name: "Musical Narrator",
    description: "Describes scenes as if breaking into song.",
    icon: "🎼",
  },
  [Genre.ANIME]: {
    id: Genre.ANIME,
    name: "Anime Narrator",
    description: "Dramatic anime-style commentary with intense energy.",
    icon: "🎌",
  },
  [Genre.STANDUP]: {
    id: Genre.STANDUP,
    name: "Standup Comedian",
    description: "Witty, observational comedy commentary.",
    icon: "🎤",
  },
  [Genre.SINGAPOREAN]: {
    id: Genre.SINGAPOREAN,
    name: "Singaporean",
    description: "Commentary in Singaporean style with local flair.",
    icon: "🇸🇬",
  },
  [Genre.SUNDAR_PICHAI]: {
    id: Genre.SUNDAR_PICHAI,
    name: "Sundar Pichai",
    description: "Thoughtful, measured tech executive commentary.",
    icon: "👔",
  },
};
