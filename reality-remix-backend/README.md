# The Reality Remix - Backend

Python FastAPI backend server for The Reality Remix app, powered by Gemini 2.5 Flash Live API with native audio generation.

## Features

- **Real-time WebSocket streaming** for bidirectional video/audio communication
- **Gemini 2.5 Flash integration** with native audio generation and live transcription
- **19 commentary genres** with unique system prompts
- **Background music generation** using Lyria RealTime API (low-latency streaming) or Lyria batch API
- **Frame optimization** using Pillow (resize, compress, scene change detection)
- **Session management** with usage limits
- **Adaptive FPS** based on scene changes
- **Live transcription** - Real-time text output of commentary for subtitles

## Setup

### Prerequisites

- Python 3.11 or higher
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. Clone the repository and navigate to the backend directory:

```bash
cd reality-remix-backend
```

2. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create `.env` file in the `reality-remix-backend` directory:

```bash
echo "GOOGLE_GENERATIVE_AI_API_KEY=your_actual_api_key_here" > .env
```

Replace `your_actual_api_key_here` with your actual Gemini API key.

Optional: Add additional configuration to `.env`:
```bash
USE_LYRIA_REALTIME=True
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:19006
LOG_LEVEL=INFO
```

### Running the Server

Development mode with auto-reload:

```bash
python -m app.main
```

Or using uvicorn directly:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The server will start on [http://localhost:8000](http://localhost:8000)

## API Endpoints

### REST API

- `GET /` - Root endpoint (health check)
- `GET /health` - Health check endpoint
- `GET /api/genres` - List all available commentary genres

### WebSocket

- `ws://localhost:8000/ws/reality-remix` - WebSocket endpoint for streaming

## WebSocket Protocol

### Client → Server Messages

**Start Session:**
```json
{
  "type": "session_start",
  "genre": "nature_documentary",
  "fps": 1.0
}
```

**Send Video Frame:**
```json
{
  "type": "frame",
  "data": "<base64-jpeg>",
  "timestamp": 1234567890
}
```

**Change Genre:**
```json
{
  "type": "genre_change",
  "genre": "sports"
}
```

**Stop Session:**
```json
{
  "type": "session_stop"
}
```

### Server → Client Messages

**Audio Commentary:**
```json
{
  "type": "audio_chunk",
  "data": "<base64-pcm-audio>",
  "timestamp": 1234567890
}
```

**Music Chunk:**
```json
{
  "type": "music_chunk",
  "data": "<base64-audio>",
  "timestamp": 1234567890
}
```

**Transcription:**
```json
{
  "type": "transcription",
  "text": "Commentary text for subtitles",
  "transcription_type": "speaking",
  "timestamp": 1234567890
}
```

**Turn Complete:**
```json
{
  "type": "turn_complete"
}
```

**Error:**
```json
{
  "type": "error",
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

## Available Genres

The backend supports **19 unique commentary genres**:

1. **Nature Documentary** (`nature_documentary`) - David Attenborough style 🌿
2. **Sports Commentary** (`sports`) - Excited play-by-play 🏆
3. **Thriller** (`thriller`) - Film noir suspense 🕵️
4. **Romantic Comedy** (`romcom`) - Witty rom-com observations 💕
5. **Horror** (`horror`) - Ominous narration 😱
6. **Cooking Show** (`cooking`) - Enthusiastic chef 👨‍🍳
7. **Science Documentary** (`science`) - Educational exploration 🔬
8. **Reality TV** (`reality_tv`) - Dramatic commentary 📺
9. **Time Traveler Historian** (`time_traveler_historian`) - Historical perspective 🕰️
10. **Gen-Z Slang Mode** (`genz_slang`) - Short, energetic, playful 🗣️
11. **Corporate Consultant** (`corporate_consultant`) - Dry, analytical commentary 📉
12. **Overly Serious Academic** (`overly_serious_academic`) - Peer-reviewed style 🧑‍🏫
13. **Musical Narrator** (`musical_narrator`) - Theatrical, lyrical descriptions 🎼
14. **Anime Narrator** (`anime_narrator`) - Dramatic, over-the-top energy 🎌
15. **Standup Comedian** (`standup_comedian`) - Witty observational comedy 🎤
16. **Singaporean** (`singaporean`) - Local style with Singlish expressions 🇸🇬
17. **Sundar Pichai** (`sundar_pichai`) - Thoughtful tech executive commentary 👔
18. **TikTok Influencer** (`tiktok_influencer`) - Energetic, trend-focused 📱
19. **Asian Parent** (`asian_parent`) - Caring commentary with typical concerns 👨‍👩‍👧

## Configuration

Edit `.env` to configure:

**Required:**
- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Gemini API key (required)

**Music Generation:**
- `USE_LYRIA_REALTIME` - Use Lyria RealTime for low-latency music streaming (default: True)
- `GCP_PROJECT_ID` - Google Cloud Project ID (required if using Lyria batch API)
- `GCP_LOCATION` - GCP location (default: us-central1)
- `GCP_SERVICE_ACCOUNT_JSON` - Service account JSON as string (required if using Lyria batch API)

**Server Configuration:**
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated, default: http://localhost:5173,http://localhost:19006)
- `LOG_LEVEL` - Logging level (default: INFO)

**Frame Processing:**
- `MAX_FRAME_WIDTH` - Maximum frame width (default: 512)
- `MAX_FRAME_HEIGHT` - Maximum frame height (default: 512)
- `JPEG_QUALITY` - JPEG compression quality (default: 70)
- `SCENE_CHANGE_THRESHOLD` - Scene change detection threshold (default: 0.15)
- `STATIC_SCENE_FPS` - FPS for static scenes (default: 1.0)
- `DYNAMIC_SCENE_FPS` - FPS for dynamic scenes (default: 2.0)

**Session Management:**
- `MAX_SESSION_DURATION_SECONDS` - Max session length (default: 600)
- `MAX_DAILY_USAGE_SECONDS` - Max daily usage per user (default: 1800)

**Gemini Model:**
- `GEMINI_MODEL` - Gemini model name (default: gemini-2.5-flash-native-audio-preview-12-2025)

## Testing

Test the WebSocket endpoint using `wscat`:

```bash
npm install -g wscat
wscat -c ws://localhost:8000/ws/reality-remix
```

Then send a session start message:

```json
{"type": "session_start", "genre": "nature_documentary", "fps": 1.0}
```

## Project Structure

```
reality-remix-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI app & WebSocket endpoint
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py               # Configuration management
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py              # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_live_client.py   # Gemini Live API client
│   │   ├── frame_processor.py      # Frame optimization
│   │   ├── genre_manager.py        # Genre prompts
│   │   └── session_manager.py      # Session tracking
│   └── api/
│       ├── __init__.py
│       └── websocket.py            # (future: split WebSocket logic)
├── requirements.txt
├── .env
├── .gitignore
└── README.md
```

## Troubleshooting

**Connection to Gemini fails:**
- Check your API key in `.env`
- Ensure you have internet connectivity
- Verify the Gemini Live API endpoint is correct

**Frame processing errors:**
- Ensure frames are base64-encoded JPEG images
- Check frame size is reasonable (<5MB)

**WebSocket disconnects:**
- Sessions timeout after 10 minutes by default
- Check network connectivity
- Review server logs for errors

## License

MIT
