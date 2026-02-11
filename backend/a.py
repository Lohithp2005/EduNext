from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from gemini_webapi import GeminiClient
from gemini_webapi.constants import Model
from contextlib import asynccontextmanager
from pathlib import Path
import asyncio, json, traceback, uuid, re
import cv2
import numpy as np
import mediapipe as mp
import queue
import threading
import time
from PIL import Image
import math
from rembg import remove
import random

# ================== CONFIG ==================
BASE_DIR = Path(__file__).resolve().parent
IMAGE_DIR = (BASE_DIR / "generated_images").resolve()
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

# ================== GLOBAL STATE ==================
client: GeminiClient | None = None
cap = None
camera_on = False

lesson = None
lesson_steps = []
current_step = 0

# Draggable objects state
draggable_objects = []
hand_positions = []

# Voice system
voice_queue = queue.Queue()
voice_thread_running = False

# Performance optimization
frame_skip_counter = 0
PROCESS_EVERY_N_FRAMES = 2  # Process hand detection every 2 frames

# ================== FASTAPI ==================
@asynccontextmanager
async def gemini_connection(app: FastAPI):
    global client
    print("Connecting to Gemini...")
    client = GeminiClient()
    await client.init(timeout=90, auto_close=False, auto_refresh=True)
    try:
        yield
    finally:
        if client:
            await client.close()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------ MediaPipe ------------------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.6,
    min_tracking_confidence=0.6,
)
mp_draw = mp.solutions.drawing_utils

# ------------------ Load images ------------------
cloud_png = cv2.imread("generated_images/obj_cloud_05996efd_2_transparent.png", cv2.IMREAD_UNCHANGED)
sun_png = cv2.imread("generated_images/obj_golden_sun_11f9e15a_0_transparent.png", cv2.IMREAD_UNCHANGED)
ocean_png = cv2.imread("generated_images/obj_ocean_60d10f2b_0.png", cv2.IMREAD_UNCHANGED)
rain_png = cv2.imread("generated_images/raindrop3.png", cv2.IMREAD_UNCHANGED)

if cloud_png is None or sun_png is None or ocean_png is None or rain_png is None:
    raise Exception("❌ Could not load one or more images")

# ------------------ Helpers ------------------
def resize_with_alpha(img, target_w=None, target_h=None, keep_aspect=True):
    h, w = img.shape[:2]
    if keep_aspect:
        target = target_w or target_h
        scale = target / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
    else:
        new_w = target_w or w
        new_h = target_h or h
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

def resize_ocean_for_frame(ocean_img, frame_w, frame_h, height_ratio=0.28):
    return cv2.resize(
        ocean_img,
        (frame_w, int(frame_h * height_ratio)),
        interpolation=cv2.INTER_AREA
    )

def overlay_png(bg, overlay, x, y):
    h, w = overlay.shape[:2]
    if x + w <= 0 or y + h <= 0 or x >= bg.shape[1] or y >= bg.shape[0]:
        return bg

    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(bg.shape[1], x + w)
    y2 = min(bg.shape[0], y + h)

    ox1 = x1 - x
    oy1 = y1 - y
    ox2 = ox1 + (x2 - x1)
    oy2 = oy1 + (y2 - y1)

    overlay_crop = overlay[oy1:oy2, ox1:ox2]

    if overlay_crop.shape[2] == 4:
        alpha = overlay_crop[:, :, 3:4] / 255.0
        bg[y1:y2, x1:x2] = (
            alpha * overlay_crop[:, :, :3] +
            (1 - alpha) * bg[y1:y2, x1:x2]
        ).astype(np.uint8)
    else:
        bg[y1:y2, x1:x2] = overlay_crop[:, :, :3]

    return bg

def is_hand_near(x, y, obj, radius=70):
    cx = obj["x"] + obj["width"] // 2
    cy = obj["y"] + obj["height"] // 2
    return abs(x - cx) < radius and abs(y - cy) < radius

# ------------------ Camera state ------------------
camera_on = False
cap = None

# ------------------ Temperature bar ------------------
temp_celsius = 25
max_temp = 100
temp_grabbed = False
bar_x = 100
bar_y_top = 60
bar_y_bottom = 430

# ------------------ Vapor + Rain ------------------
vapor_particles = []
vapor_active = False
cloud_ready = False

rain_particles = []
rain_active = False

rain_start_time = None  # global
RAIN_DURATION = 3  # seconds


# --- Shake tracking ---
last_cloud_x = None
shake_energy = 0

# ------------------ Static objects ------------------
cloud_png = resize_with_alpha(cloud_png, target_w=240)
sun_png = resize_with_alpha(sun_png, target_w=260)
rain_png = resize_with_alpha(rain_png, target_w=40)

objects = [
    {"name": "cloud", "img": cloud_png, "x": 400, "y": 30,
     "width": cloud_png.shape[1], "height": cloud_png.shape[0], "active": False, "grabbed": False},
    {"name": "sun", "img": sun_png, "x": 1000, "y": 10,
     "width": sun_png.shape[1], "height": sun_png.shape[0], "active": True},
    {"name": "ocean", "img": ocean_png, "x": 0, "y": 0,
     "width": ocean_png.shape[1], "height": ocean_png.shape[0], "active": True},
]

# ------------------ Frame generator ------------------
def gen_frames():
    global cap, camera_on, temp_celsius, temp_grabbed
    global vapor_particles, vapor_active, cloud_ready
    global rain_particles, rain_active
    global last_cloud_x, shake_energy

    while camera_on:
        success, frame = cap.read()
        if not success:
            continue

        frame = cv2.flip(frame, 1)
        h, w = frame.shape[:2]

        # ----------- Temperature bar -----------
        cv2.rectangle(frame, (bar_x, bar_y_top), (bar_x + 40, bar_y_bottom), (50, 50, 50), 2)
        fill_y = int(bar_y_bottom - ((temp_celsius / max_temp) * (bar_y_bottom - bar_y_top)))
        cv2.rectangle(frame, (bar_x, fill_y), (bar_x + 40, bar_y_bottom), (0, 0, 255), -1)
        cv2.putText(frame, f"{int(temp_celsius)}°C",
                    (bar_x + 50, (bar_y_top + bar_y_bottom) // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        # ----------- Hand detection -----------
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)

        hand_x, hand_y = None, None
        grab = False

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                hand_x = int(hand_landmarks.landmark[9].x * w)
                hand_y = int(hand_landmarks.landmark[9].y * h)

                thumb = hand_landmarks.landmark[4]
                index = hand_landmarks.landmark[8]
                grab = math.hypot(thumb.x - index.x, thumb.y - index.y) < 0.12

                cv2.circle(frame, (hand_x, hand_y), 10, (0, 255, 0) if grab else (255, 0, 0), -1)

        # ----------- Temperature drag -----------
        if hand_x and grab:
            if bar_x - 30 < hand_x < bar_x + 70 and bar_y_top < hand_y < bar_y_bottom:
                temp_grabbed = True

        if not grab:
            temp_grabbed = False

        if temp_grabbed and hand_y:
            temp_celsius = max(0, min(max_temp,
                int((bar_y_bottom - hand_y) / (bar_y_bottom - bar_y_top) * max_temp)))

        # ----------- Ocean resize -----------
        ocean = next(o for o in objects if o["name"] == "ocean")
        ocean["img"] = resize_ocean_for_frame(ocean_png, w, h)
        ocean["width"], ocean["height"] = ocean["img"].shape[1], ocean["img"].shape[0]
        ocean["x"] = 0
        ocean["y"] = h - ocean["height"]

        # ----------- EVAPORATION -----------
        if temp_celsius >= 30 and not vapor_active and not cloud_ready:
            vapor_particles.clear()
            for _ in range(25):
                vapor_particles.append({
                    "x": random.randint(80, w - 80),
                    "y": ocean["y"] - random.randint(5, 25),
                    "vy": random.uniform(4, 5),
                    "r": random.randint(8, 12),
                    "stuck": False
                })
            vapor_active = True

        # ----------- Vapor animation -----------
        for v in vapor_particles:
            if not v["stuck"]:
                v["y"] -= v["vy"]
                if v["y"] < 120:
                    v["stuck"] = True
            cv2.circle(frame, (int(v["x"]), int(v["y"])), v["r"], (210, 210, 210), -1)

        # ----------- Condensation -----------
        cloud = next(o for o in objects if o["name"] == "cloud")
        if temp_celsius < 20 and vapor_particles and not cloud_ready:
            cloud["active"] = True
            cloud["x"] = w // 2 - cloud["width"] // 2
            cloud["y"] = 30
            vapor_particles.clear()
            vapor_active = False
            cloud_ready = True

        # ===============================
        # ✅ CLOUD GRAB + DRAG LOGIC
        # ===============================
        if cloud["active"] and hand_x and grab and is_hand_near(hand_x, hand_y, cloud):
            cloud["grabbed"] = True

        if cloud["grabbed"] and hand_x:
            cloud["x"] = hand_x - cloud["width"] // 2
            cloud["y"] = hand_y - cloud["height"] // 2

        if not grab:
            cloud["grabbed"] = False
            last_cloud_x = None
            shake_energy = 0
        # ------------------------------
        # ✅ SHAKE DETECTION
        # ------------------------------
        MAX_RAIN_DROPS = 30  # max drops at a time
        RAIN_DURATION = 3    # seconds

        if cloud["grabbed"]:
            if last_cloud_x is not None:
                dx = abs(cloud["x"] - last_cloud_x)
                shake_energy += dx

                if shake_energy > 10:  # lower threshold for shake
                    if not rain_active:
                        rain_active = True
                        rain_start_time = time.time()  # start timer

            last_cloud_x = cloud["x"]

        # ------------------------------
        # ✅ RAIN SPAWN
        # ------------------------------
        if rain_active and len(rain_particles) < MAX_RAIN_DROPS:
            for _ in range(2):  # spawn fewer drops per frame
                rain_particles.append({
                    "x": cloud["x"] + random.randint(20, cloud["width"] - 20),
                    "y": cloud["y"] + cloud["height"] - 10,
                    "vy": random.uniform(9, 13)
                })

        # ------------------------------
        # ✅ RAIN ANIMATION
        # ------------------------------
        new_rain = []
        for r in rain_particles:
            r["y"] += r["vy"]
            if r["y"] < ocean["y"]:  # only keep drops above ocean
                frame = overlay_png(frame, rain_png, int(r["x"]), int(r["y"]))
                new_rain.append(r)
        rain_particles = new_rain

        # ------------------------------
        # ✅ STOP RAIN AFTER SOME TIME OR TEMP
        # ------------------------------
        if rain_active:
            # stop after RAIN_DURATION seconds
            if time.time() - rain_start_time > RAIN_DURATION:
                rain_active = False
                rain_particles.clear()
                shake_energy = 0
                rain_start_time = None

            # stop if temp rises
            if temp_celsius > 25:
                rain_active = False
                rain_particles.clear()
                shake_energy = 0
                rain_start_time = None
      # ----------- Draw objects -----------
        frame = overlay_png(frame, ocean["img"], ocean["x"], ocean["y"])
        sun = next(o for o in objects if o["name"] == "sun")
        frame = overlay_png(frame, sun["img"], sun["x"], sun["y"])
        if cloud["active"]:
            frame = overlay_png(frame, cloud["img"], cloud["x"], cloud["y"])

        # ----------- Encode ----------
        ret, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ret:
            continue

        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")

# ------------------ API ------------------
@app.post("/camera/start")
async def start_camera():
    global camera_on, cap

    if camera_on:
        return {"status": "already running"}



    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        return {"status": "error", "message": "Camera not accessible"}

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    camera_on = True
    return {"status": "started"}

@app.post("/camera/stop")
async def stop_camera():
    global camera_on, cap
    camera_on = False
    if cap:
        cap.release()
        cap = None
    return {"status": "stopped"}

@app.get("/video")
async def video():
    if not camera_on or not cap:
        return {"error": "Camera not started"}
    return StreamingResponse(gen_frames(),
                             media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/")
async def root():
    return {"status": "running", "camera_on": camera_on}
