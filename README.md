# The Reality Remix

Turn everyday life into instant entertainment using Gemini 2.5 Flash Live API with native audio generation. This project consists of a Python FastAPI backend and a React frontend that work together to provide real-time AI-powered commentary on your camera feed, complete with background music and live subtitles.

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** (for backend)
- **Node.js 18+** (for frontend)
- **Google Gemini API Key** - Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Running the Application

#### Manual Setup

**Backend Setup:**

1. Navigate to the backend directory:
   ```bash
   cd reality-remix-backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the `reality-remix-backend` directory:
   ```bash
   echo "GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here" > .env
   ```
   Replace `your_api_key_here` with your actual Gemini API key.

5. Run the backend server:
   ```bash
   python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

**Frontend Setup:**

1. Navigate to the frontend directory:
   ```bash
   cd reality-remix-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## 📖 Usage

1. Make sure both backend and frontend servers are running
2. Open the web app in your browser (`http://localhost:5173`)
3. Click "Start Camera" and allow camera permissions
4. Choose a commentary genre from the dropdown
5. Click "Start Commentary"
6. Point your camera at anything and enjoy the AI-generated commentary with background music and live subtitles!

## 🎭 Available Genres

The app features **19 unique commentary styles**:

- 🌿 **Nature Documentary** - David Attenborough style
- 🏆 **Sports Commentary** - Excited play-by-play
- 🕵️ **Thriller** - Film noir suspense
- 💕 **Romantic Comedy** - Witty rom-com observations
- 😱 **Horror** - Ominous narration
- 👨‍🍳 **Cooking Show** - Enthusiastic chef
- 🔬 **Science Documentary** - Educational exploration
- 📺 **Reality TV** - Dramatic commentary
- 🕰️ **Time Traveler Historian** - Historical perspective
- 🗣️ **Gen-Z Slang Mode** - Short, energetic, playful
- 📉 **Corporate Consultant** - Dry, analytical commentary
- 🧑‍🏫 **Overly Serious Academic** - Peer-reviewed style
- 🎼 **Musical Narrator** - Theatrical, lyrical descriptions
- 🎌 **Anime Narrator** - Dramatic, over-the-top energy
- 🎤 **Standup Comedian** - Witty observational comedy
- 🇸🇬 **Singaporean** - Local style with Singlish expressions
- 👔 **Sundar Pichai** - Thoughtful tech executive commentary
- 📱 **TikTok Influencer** - Energetic, trend-focused
- 👨‍👩‍👧 **Asian Parent** - Caring commentary with typical concerns

## 🎵 Features

- **Real-time AI Commentary** - Powered by Gemini 2.5 Flash with native audio generation
- **Background Music** - Genre-matched music using Lyria RealTime API
- **Live Subtitles** - Real-time transcription of commentary displayed on screen
- **Multiple Genres** - Switch between 19 different commentary styles
- **Frame Optimization** - Intelligent frame processing for optimal performance

## 🏗️ Project Structure

```
gemini-hackathon/
├── reality-remix-backend/    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app & WebSocket endpoint
│   │   ├── core/             # Configuration
│   │   ├── models/           # Pydantic schemas
│   │   └── services/         # Business logic (Gemini, Lyria, frame processing)
│   ├── requirements.txt
│   └── README.md
├── reality-remix-web/         # React frontend
│   ├── src/
│   │   ├── components/       # React components (Camera, GenreSelector, Subtitles)
│   │   ├── hooks/            # Custom React hooks (audio, music, frame capture)
│   │   └── services/         # WebSocket client
│   ├── package.json
│   └── README.md
└── README.md                 # This file
```

## 🔧 Configuration

### Backend Configuration

Create a `.env` file in the `reality-remix-backend` directory with:

- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Gemini API key (required)
- `USE_LYRIA_REALTIME` - Use Lyria RealTime for low-latency music (default: True)
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `LOG_LEVEL` - Logging level (default: INFO)

See `reality-remix-backend/README.md` for full configuration options.

### Frontend Configuration

The frontend connects to the backend WebSocket at `ws://localhost:8000/ws/reality-remix` by default. If you change the backend port, update the WebSocket URL in `reality-remix-web/src/services/websocket-client.ts`.

## 🐛 Troubleshooting

**Backend won't start:**
- Ensure Python 3.11+ is installed
- Check that `.env` file exists with a valid API key
- Verify all dependencies are installed: `pip install -r requirements.txt`

**Frontend won't start:**
- Ensure Node.js 18+ is installed
- Run `npm install` to install dependencies
- Check that port 5173 is not already in use

**WebSocket connection fails:**
- Ensure the backend is running on port 8000
- Check browser console for connection errors
- Verify CORS settings in backend configuration

**Camera not working:**
- Ensure you've granted camera permissions in your browser
- Check that no other application is using the camera
- Try a different browser (Chrome, Safari, Firefox, Edge)

## 📚 Additional Documentation

- [Backend README](reality-remix-backend/README.md) - Detailed backend documentation
- [Frontend README](reality-remix-web/README.md) - Frontend-specific information

## 📝 License

MIT

