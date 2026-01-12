# The Reality Remix - Web App

React frontend for The Reality Remix - turn everyday life into instant entertainment using Gemini 2.5 Flash with native audio generation, background music, and live subtitles.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

**Note:** Make sure the backend server is running on `http://localhost:8000` before starting the frontend.

## Usage

1. Start the backend server first (see `../reality-remix-backend/README.md`)
2. Click "Start Camera" and allow permissions  
3. Choose a commentary genre from the dropdown
4. Click "Start Commentary"
5. Point your camera at anything and enjoy the AI-generated commentary with background music and live subtitles!

## Available Genres

The app features **19 unique commentary styles**:

🌿 Nature Documentary | 🏆 Sports | 🕵️ Thriller | 💕 Rom-Com  
😱 Horror | 👨‍🍳 Cooking Show | 🔬 Science | 📺 Reality TV  
🕰️ Time Traveler | 🗣️ Gen-Z | 📉 Corporate | 🧑‍🏫 Academic  
🎼 Musical | 🎌 Anime | 🎤 Standup | 🇸🇬 Singaporean  
👔 Sundar Pichai | 📱 TikTok | 👨‍👩‍👧 Asian Parent

## Features

- **Real-time camera feed** with frame capture
- **Live AI commentary** with native audio generation
- **Background music** that matches the selected genre
- **Live subtitles** showing real-time transcription of commentary
- **Genre switching** - Change commentary style mid-session
- **Connection status** indicators

## Project Structure

```
reality-remix-web/
├── src/
│   ├── components/
│   │   ├── CameraView.tsx      # Camera component with controls
│   │   ├── GenreSelector.tsx    # Genre selection dropdown
│   │   └── Subtitles.tsx        # Live subtitle display
│   ├── hooks/
│   │   ├── useAudioStream.ts    # Audio playback for commentary
│   │   ├── useMusicStream.ts    # Music playback
│   │   ├── useCamera.ts         # Camera access
│   │   └── useFrameCapture.ts   # Frame capture from video
│   ├── services/
│   │   └── websocket-client.ts  # WebSocket client for backend communication
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   └── App.tsx                  # Main application component
├── package.json
└── README.md
```

## Browser Support

Works on Chrome, Safari, Firefox, Edge (desktop & mobile)

**Note:** Camera access requires HTTPS in production (or localhost for development)

## License

MIT
