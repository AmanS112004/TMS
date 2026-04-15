import sys
import os
import base64
import cv2
import numpy as np
from fastapi import FastAPI, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# Add parent directory to path so we can import vehicle_detection
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
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

detector = VehicleDetector()
signal_controller = TrafficSignalController()

@app.get("/")
async def root():
    return {"message": "AI Smart Traffic System API is running"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
