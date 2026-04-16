import sys
import os
import base64
import cv2
import numpy as np
from fastapi import FastAPI, Form, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
import os
from dotenv import load_dotenv
from groq import Groq
import google.generativeai as genai
import nltk
from nltk.tokenize import word_tokenize
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Initialize NLTK
try:
    nltk.download('punkt', quiet=True)
    nltk.download('punkt_tab', quiet=True)
except Exception as e:
    print(f"NLTK Download Error: {e}")

# Load environment variables
load_dotenv()

from vehicle_detection import VehicleDetector
from signal_time import TrafficSignalController

app = FastAPI(title="AI Smart Traffic API")

# Enable CORS for React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware for Security Headers (Required for Google Auth Popups)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    return response

detector = VehicleDetector()
signal_controller = TrafficSignalController()

# AI Clients Initialization
GROQ_KEY = os.getenv("GROQ_API_KEY")
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID") or "1043940495048-f5m5fviaivrdob4pdu0oe169fu81ivbe.apps.googleusercontent.com"

if not GROQ_KEY or not GEMINI_KEY:
    print("WARNING: API keys not found in environment variables!")

groq_client = Groq(api_key=GROQ_KEY)
genai.configure(api_key=GEMINI_KEY)
gemini_model = genai.GenerativeModel("gemini-1.5-flash")


@app.post("/auth/google")
async def google_auth(request: Request):
    """
    Verify Google ID Token from frontend.
    """
    try:
        body = await request.json()
        token = body.get("token")
        
        if not token:
            return {"error": "Token missing"}

        # Verify the ID token
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)

        # ID token is valid. Get the user's Google Account ID from the decoded token.
        userid = idinfo['sub']
        email = idinfo.get('email')
        name = idinfo.get('name')
        picture = idinfo.get('picture')

        return {
            "success": True,
            "user": {
                "id": userid,
                "email": email,
                "name": name,
                "picture": picture
            }
        }
    except ValueError as e:
        # Invalid token
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Internal error: {str(e)}"}

@app.post("/narrate")
async def narrate_traffic(request: Request):
    """
    AI Narration Endpoint with Fallback Logic (Groq -> Gemini).
    """
    try:
        body = await request.json()
        count = body.get("count", 0)
        timings = body.get("timings", {})
        
        prompt = (
            "You are the Lead AI Traffic Controller of a city command center. Analyze this real-time data and explain your "
            "reasoning as if you are managing the intersection right now.\n"
            f"DETECTED TRAFFIC: {count} vehicles.\n"
            f"SIGNAL RECOMMENDATION: Green: {timings.get('green')}s, Red: {timings.get('red')}s, Yellow: {timings.get('yellow')}s.\n\n"
            "LOGIC RULES YOU USED:\n"
            "- Green Time: 10s base + 2s for every vehicle to ensure the queue clears.\n"
            "- Red Time: Dynamic duration to manage cross-junction pressure.\n"
            "- Yellow Time: Safety margin that increases as density rises.\n\n"
            "Explain the situation professionally. Don't just list numbers; explain HOW you are optimizing "
            "the flow for this specific vehicle count. Speak as if you are in control."
        )

        # Primary: Groq (Llama 3.3 70B)
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500
            )
            narrative = completion.choices[0].message.content
            return {"narrative": narrative, "provider": "groq"}
        except Exception as e:
            print(f"Groq Error: {e}. Falling back to Gemini...")
            # Fallback: Gemini
            response = gemini_model.generate_content(prompt)
            return {"narrative": response.text, "provider": "gemini"}

    except Exception as e:
        return {"error": str(e)}

@app.post("/chat")
async def chat_with_traffic_ai(request: Request):
    """
    Smart Chatbot Endpoint. Logic consistent with user provided snippet + AI Fallback.
    """
    try:
        data = await request.json()
        query = data.get("query", "").lower()
        vc = data.get("count", 0)
        timings = data.get("timings", {"green": 0, "red": 0, "yellow": 0})
        
        tokens = word_tokenize(query)
        
        level = "LOW" if vc < 20 else "HIGH"
        
        if any(word in tokens for word in ["vehicle", "cars", "count", "many"]):
            return {"response": f"There are currently {vc} vehicles detected."}

        elif any(word in tokens for word in ["traffic", "busy", "congestion", "jam"]):
            return {"response": f"Traffic flow is currently {level}. The AI detector sees {vc} vehicles."}

        elif any(word in tokens for word in ["signal", "time", "green", "red"]):
            return {"response": f"The signal is currently optimized: Green for {timings.get('green')}s, Red for {timings.get('red')}s. This is calculated as a base 10s plus 2s per vehicle."}

        elif any(word in tokens for word in ["suggest", "improve", "optimize", "better"]):
            if vc > 40:
                return {"response": "Traffic is heavy. I have already increased the green signal duration to clear the queue faster."}
            elif vc < 10:
                return {"response": "Traffic is light. I've reduced the green cycle to minimize unnecessary waiting for other lanes."}
            else:
                return {"response": "Traffic is moderate. Current timing is optimal for the current vehicle flow."}

        elif any(word in tokens for word in ["status", "situation", "overview", "update"]):
            return {"response": f"Current Status: {level} traffic density with {vc} vehicles. Signal timing: {timings.get('green')}s Green / {timings.get('red')}s Red."}

        else:
            prompt = (
                "You are the AI Traffic Controller Chatbot. Answer the following user question about this intersection.\n"
                f"CURRENT DATA: {vc} vehicles, timings: {timings}.\n"
                f"USER QUESTION: {query}\n"
                "Be professional, concise, and helpful. Use the data provided."
            )
            try:
                completion = groq_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=150
                )
                return {"response": completion.choices[0].message.content}
            except:
                response = gemini_model.generate_content(prompt)
                return {"response": response.text}

    except Exception as e:
        return {"error": str(e)}

@app.post("/detect/frame")
async def detect_frame(image: str = Form(...)):
    """
    Endpoint for real-time webcam frames (Base64).
    """
    try:
        # Decode base64 string
        if "," in image:
            image = image.split(",")[1]
        
        data = base64.b64decode(image)
        nparr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Invalid image data"}

        # Run detection
        processed_img, count = detector.detect(img)
        
        # Calculate signal timings
        signal_controller.update_signal_timings(count)
        timings = {
            "green": signal_controller.green_time,
            "red": signal_controller.red_time,
            "yellow": signal_controller.yellow_time
        }
        
        # Encode result back to base64
        _, buffer = cv2.imencode('.jpg', processed_img)
        processed_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "image": f"data:image/jpeg;base64,{processed_base64}",
            "count": count,
            "timings": timings
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/detect/upload")
async def detect_upload(file: UploadFile = File(...)):
    """
    Endpoint for static image uploads.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            return {"error": "Invalid image format"}

        # Run detection
        processed_img, count = detector.detect(img)
        
        # Calculate signal timings
        signal_controller.update_signal_timings(count)
        timings = {
            "green": signal_controller.green_time,
            "red": signal_controller.red_time,
            "yellow": signal_controller.yellow_time
        }
        
        # Encode result back to base64 for preview
        _, buffer = cv2.imencode('.jpg', processed_img)
        processed_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "image": f"data:image/jpeg;base64,{processed_base64}",
            "count": count,
            "filename": file.filename,
            "timings": timings
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/health")
async def health():
    return {"status": "ok", "message": "AI Smart Traffic System API is running"}

# Serve frontend
if os.path.exists("static"):
    # Mount the assets directory specifically
    assets_path = os.path.join("static", "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")
    
    # Mount any other static folders if needed (like public files)
    app.mount("/static", StaticFiles(directory="static"), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse("static/index.html")

    @app.get("/{rest_of_path:path}")
    async def serve_spa(request: Request, rest_of_path: str):
        # If it's an API route that wasn't found, don't serve HTML
        if rest_of_path.startswith("auth/") or rest_of_path.startswith("detect/"):
            return {"error": "Not Found"}
        return FileResponse("static/index.html")
else:
    print("WARNING: 'static' directory not found.")
    @app.get("/")
    async def root():
        return {"message": "AI Smart Traffic System API is running (Frontend missing)"}
