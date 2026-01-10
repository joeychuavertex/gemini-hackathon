# The Reality Remix

Turn everyday life into instant entertainment using Gemini 2.0 Flash Live API. This project consists of a Python FastAPI backend and a React frontend that work together to provide real-time AI-powered commentary on your camera feed.

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** (for backend)
- **Node.js 18+** (for frontend)
- **Google Gemini API Key** - Get one from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Running the Application

#### Option 1: Using the Shell Scripts (Recommended)

1. **Start the Backend:**
   ```bash
   ./run-backend.sh
   ```
   The backend will start on `http://localhost:8000`

2. **Start the Frontend** (in a new terminal):
   ```bash
   ./run-frontend.sh
   ```
   The frontend will start on `http://localhost:5173`

#### Option 2: Manual Setup

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
6. Point your camera at anything and enjoy the AI-generated commentary!

## 🎭 Available Genres

- 🌿 **Nature Documentary** - David Attenborough style
- 🏆 **Sports Commentary** - Excited play-by-play
- 🕵️ **Thriller** - Film noir suspense
- 💕 **Romantic Comedy** - Witty rom-com observations
- 😱 **Horror** - Ominous narration
- 👨‍🍳 **Cooking Show** - Enthusiastic chef
- 🔬 **Science Documentary** - Educational exploration
- 📺 **Reality TV** - Dramatic commentary

## 🏗️ Project Structure

```
gemini-hackathon/
├── reality-remix-backend/    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app & WebSocket endpoint
│   │   ├── core/             # Configuration
│   │   ├── models/           # Pydantic schemas
│   │   └── services/         # Business logic
│   ├── requirements.txt
│   └── README.md
├── reality-remix-web/         # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/            # Custom React hooks
│   │   └── services/         # WebSocket client
│   ├── package.json
│   └── README.md
├── run-backend.sh            # Backend startup script
├── run-frontend.sh           # Frontend startup script
└── README.md                 # This file
```

## 🔧 Configuration

### Backend Configuration

Edit `reality-remix-backend/.env` to configure:

- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Gemini API key (required)
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

