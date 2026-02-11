from fastapi import FastAPI , HTTPException
from fastapi.middleware.cors import CORSMiddleware
from gemini_webapi import GeminiClient
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi.requests import Request
from fastapi.responses import JSONResponse
import asyncio
import json
import traceback
from gemini_webapi.constants import Model 
import re
import queue
from typing import Any
import uuid
from fastapi.staticfiles import StaticFiles
import base64
from fastapi.responses import StreamingResponse
import cv2
import time
import numpy as np
import math
import mediapipe as mp
import random

client: GeminiClient | None = None


@asynccontextmanager
async def gemini_connection(app: FastAPI):
    global client
    print("Connecting to Gemini...")
    client = GeminiClient()
    await client.init(timeout=30, auto_close=False, auto_refresh=True)
    try:
        yield
    finally:
        print("Closing Gemini connection...")
        if client:
            await client.close()
            client = None

app = FastAPI(lifespan=gemini_connection)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
IMAGE_DIR = (BASE_DIR / "generated_images").resolve()
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/generated_images", StaticFiles(directory=IMAGE_DIR), name="generated_images")



def safe_name(value: str | None, fallback: str = "image") -> str:
    if not value:
        return fallback
    v = str(value).strip()
    if v.lower() in ("undefined", "null", "none", ""):
        return fallback
    v = re.sub(r"[^A-Za-z0-9_-]+", "_", v).strip("_").lower()
    return v or fallback

@app.post("/api/generate-quiz")
async def generate_image(request: Request) -> Any:
    global client
    if client is None:
        return JSONResponse(
            status_code=500,
            content={"ok": False, "stage": "startup", "error": "Gemini client not initialized"}
        )

    try:
        body = await request.json()
    except Exception:
        body = {}

    topic = body.get("topic", "science")
    character = body.get("character", "Doraemon")
    theory_content = body.get("theoryContent", "")
    language = body.get("language", "en")

    language_instructions = {
        "en": "English",
        "ta": "Tamil",
        "kn": "Kannada",
        "hi": "Hindi",
        "te": "Telugu"
    }
    lang_name = language_instructions.get(language, "English")

    # ---------------- PROMPT ----------------
    if theory_content:
        prompt = f"""
CRITICAL: Write EVERYTHING in {lang_name} ONLY. No English. No Arabic numerals.

Create a kids quiz using {character} based on this theory:

{theory_content[:2000]}

Topic: {topic}

Return ONLY valid JSON:
{{
  "question": "...",
  "options": ["...", "...", "..."],
  "answer": "...",
  "explanation": "...",
  "image_prompt": "Kid-friendly cartoon scene with {character}"
}}
"""
    else:
        prompt = f"""
CRITICAL: Write EVERYTHING in {lang_name} ONLY. No English. No Arabic numerals.

Create a kids quiz using {character}.
Topic: {topic}

Return ONLY valid JSON:
{{
  "question": "...",
  "options": ["...", "...", "..."],
  "answer": "...",
  "explanation": "...",
  "image_prompt": "Kid-friendly cartoon scene with {character}"
}}
"""

    # ---------------- TEXT GENERATION ----------------
    try:
        response = await asyncio.wait_for(
            client.generate_content(prompt, model=Model.G_2_5_FLASH),
            timeout=120
        )
        raw_text = response.text or ""
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=502,
            content={"ok": False, "stage": "text_generation", "error": str(e)}
        )

    # ---------------- JSON PARSING (STRICT — NO FALLBACK) ----------------
    raw_text_clean = raw_text.replace("```json", "").replace("```", "").strip()
    try:
        qa = json.loads(raw_text_clean)
    except Exception:
        return JSONResponse(
            status_code=422,
            content={
                "ok": False,
                "stage": "json_parsing",
                "error": "Model returned invalid JSON",
                "raw_model_output": raw_text
            }
        )

    # ---------------- IMAGE GENERATION ----------------
    image_paths = []
    if qa.get("image_prompt"):
        try:
            image_response = await asyncio.wait_for(
                client.generate_content(qa["image_prompt"], model=Model.G_2_5_FLASH),
                timeout=120
            )
        except Exception as e:
            traceback.print_exc()
            return JSONResponse(
                status_code=502,
                content={"ok": False, "stage": "image_generation", "error": str(e), "qa": qa}
            )

        if image_response and getattr(image_response, "images", None):
            req_id = uuid.uuid4().hex[:8]
            safe_char = safe_name(character, fallback="img")

            for i, img in enumerate(image_response.images):
                filename = f"{safe_char}_{req_id}_{i}.png"
                try:
                    await asyncio.wait_for(
                        img.save(path=str(IMAGE_DIR), filename=filename, verbose=True),
                        timeout=60
                    )

                    forwarded_host = request.headers.get("x-forwarded-host")
                    scheme = request.headers.get("x-forwarded-proto", request.url.scheme)
                    base_url = f"{scheme}://{forwarded_host}" if forwarded_host else str(request.base_url).rstrip("/")
                    image_paths.append(f"{base_url}/generated_images/{filename}")

                except Exception as e:
                    traceback.print_exc()
                    return JSONResponse(
                        status_code=500,
                        content={"ok": False, "stage": "image_saving", "error": str(e), "qa": qa}
                    )

    # ---------------- SUCCESS ----------------
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "question": qa.get("question"),
            "options": qa.get("options"),
            "answer": qa.get("answer"),
            "explanation": qa.get("explanation"),
            "character": character,
            "images": image_paths
        }
    )
@app.post("/api/generate-story")
async def generate_story(request: Request) -> Any:
    if client is None:
        return JSONResponse({"error": "Gemini not initialized"}, status_code=500)

    body = await request.json()
    prompt_text = body.get("prompt", "Write a short kids story about a brave cat")
    drawing_base64 = body.get("drawing")
    num_pages = min(max(int(body.get("num_pages", 5)), 1), 10)

    # -------- SAVE DRAWING --------
    drawing_path = None
    if drawing_base64:
        try:
            if "," in drawing_base64:
                drawing_base64 = drawing_base64.split(",")[1]
            drawing_bytes = base64.b64decode(drawing_base64)
            fname = f"drawing_{uuid.uuid4().hex[:6]}.png"
            drawing_path = IMAGE_DIR / fname
            drawing_path.write_bytes(drawing_bytes)
        except Exception:
            traceback.print_exc()

    prompt_pages = ",\n".join([
        f'{{"text": "Line {i+1}", "image_prompt": "Illustration for line {i+1}"}}'
        for i in range(num_pages)
    ])

    prompt = f"""
Write a {num_pages}-line children's story based on this description: "{prompt_text}"
Use the drawing as inspiration if provided.
Return ONLY valid JSON:
{{
  "pages": [
    {prompt_pages}
  ]
}}
"""

    # -------- STORY TEXT --------
    try:
        files_list = [drawing_path] if drawing_path else None
        story_resp = await asyncio.wait_for(
            client.generate_content(prompt, model=Model.G_2_5_FLASH, files=files_list),
            timeout=200,
        )
    except Exception:
        traceback.print_exc()
        return JSONResponse({"error": "Gemini story generation failed"}, status_code=500)

    raw = (story_resp.text or "").replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(raw)
    except Exception:
        data = {"pages": [{"text": "Once upon a time...", "image_prompt": "Cute cartoon fantasy scene"}]}

    pages = data.get("pages", [])[:num_pages]
    output_pages = []

    # -------- IMAGE PER PAGE --------
    for i, page in enumerate(pages):
        img_url = None
        if page.get("image_prompt"):
            try:
                img_resp = await asyncio.wait_for(
                    client.generate_content(page["image_prompt"], model=Model.G_2_5_FLASH),
                    timeout=150,
                )
                if img_resp.images:
                    filename = f"story_{uuid.uuid4().hex[:6]}_{i}.png"
                    await img_resp.images[0].save(path=str(IMAGE_DIR), filename=filename)
                    img_url = f"http://localhost:8000/generated_images/{filename}"
            except Exception:
                traceback.print_exc()

        output_pages.append({
            "text": page.get("text", ""),
            "image": img_url,
        })

    return JSONResponse({"pages": output_pages})


@app.post("/api/generate-theory")
async def generate_theory(request: Request) -> Any:
    """Generate theory content for a given topic"""
    global client
    if client is None:
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": "Gemini client not initialized"}
        )
    
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "Invalid request body"}
        )
    
    topic = body.get("topic", "").strip()
    language = body.get("language", "en")
    
    if not topic:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "Topic is required"}
        )
    
    # Language mapping
    language_instructions = {
        "ta": "Tamil",
        "kn": "Kannada",
        "hi": "Hindi",
        "te": "Telugu",
        "en": "English"
    }
    lang_name = language_instructions.get(language, "English")
    
    prompt = f"""You are an educational content creator for children aged 8-14.

LANGUAGE: Write EVERYTHING in {lang_name} ONLY.

Create clear, engaging theory content about: {topic}

Requirements:
1. Write in {lang_name} language only
2. Explain concepts simply for children
3. Use real-world examples
4. Break into short paragraphs
5. Keep it educational but fun
6. Around 300-500 words

Topic: {topic}

Generate the theory content now in {lang_name}:"""

    try:
        response = await asyncio.wait_for(
            client.generate_content(prompt, model=Model.G_2_5_FLASH),
            timeout=120
        )
        
        theory_text = (response.text or "").strip()
        
        if not theory_text:
            return JSONResponse(
                status_code=500,
                content={"ok": False, "error": "Failed to generate theory content"}
            )
        
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "theory": theory_text,
                "topic": topic
            }
        )
        
    except Exception as e:
        print(f"Error generating theory: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": str(e)}
        )


@app.post("/api/gemini")
async def gemini_generate(request: Request) -> Any:
    """General Gemini AI text generation endpoint"""
    global client
    if client is None:
        return JSONResponse(
            status_code=500,
            content={"error": "Gemini client not initialized"}
        )
    
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid request body"}
        )
    
    prompt = body.get("prompt", "").strip()
    language = body.get("language", "en")
    
    if not prompt:
        return JSONResponse(
            status_code=400,
            content={"error": "Prompt is required"}
        )
    
    try:
        response = await asyncio.wait_for(
            client.generate_content(prompt, model=Model.G_2_5_FLASH),
            timeout=120
        )
        
        ai_text = (response.text or "").strip()
        
        if not ai_text:
            return JSONResponse(
                status_code=500,
                content={"error": "Failed to generate content"}
            )
        
        return JSONResponse(
            status_code=200,
            content={"ai_text": ai_text}
        )
        
    except Exception as e:
        print(f"Error in Gemini generation: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


@app.post("/api/save-report")
async def save_report(request: Request) -> Any:
    """Save cognitive screening report"""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "Invalid request body"}
        )
    
    name = body.get("name", "").strip()
    age = body.get("age")
    date = body.get("date", "")
    cognitive_scores = body.get("cognitiveScores", {})
    
    if not name:
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "Name is required"}
        )
    
    if not cognitive_scores or not isinstance(cognitive_scores, dict):
        return JSONResponse(
            status_code=400,
            content={"ok": False, "error": "Invalid cognitive scores"}
        )
    
    try:
        # Create reports directory if it doesn't exist
        reports_dir = BASE_DIR / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate filename with name and timestamp
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name.replace(' ', '_')}_{timestamp}.json"
        filepath = reports_dir / filename
        
        # Prepare report data
        report_data = {
            "name": name,
            "age": age,
            "date": date,
            "cognitiveScores": cognitive_scores
        }
        
        # Save to JSON file
        with open(filepath, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        print(f"Report saved: {filepath}")
        
        return JSONResponse(
            status_code=200,
            content={
                "ok": True,
                "message": "Report saved successfully",
                "reportName": filename.replace(".json", "")
            }
        )
    
    except Exception as e:
        print(f"Error saving report: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": str(e)}
        )


@app.get("/api/list-reports")
async def list_reports() -> Any:
    """List all saved cognitive reports"""
    try:
        reports_dir = BASE_DIR / "reports"
        
        # Create reports directory if it doesn't exist
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        reports = []
        
        # Read all JSON files in reports directory
        if reports_dir.exists():
            for json_file in reports_dir.glob("*.json"):
                try:
                    with open(json_file, 'r') as f:
                        report_data = json.load(f)
                    
                    # Extract the report name (filename without .json)
                    report_name = json_file.stem
                    
                    # Extract cognitive scores
                    cognitive_scores = report_data.get("cognitiveScores", {})
                    
                    # Determine flashcard mode based on scores using scoring system
                    flashcard_mode = "general"
                    attention = cognitive_scores.get("attention", 50)
                    visual_spatial = cognitive_scores.get("visualSpatial", 50)
                    working_memory = cognitive_scores.get("workingMemory", 50)
                    auditory_processing = cognitive_scores.get("auditoryProcessing", 50)
                    
                    # Calculate match scores for each profile
                    dyslexia_score = 0
                    adhd_score = 0
                    autism_score = 0
                    
                    # Dyslexia: Low visual-spatial + High auditory
                    if visual_spatial < 45:
                        dyslexia_score += (45 - visual_spatial) / 45 * 100
                    if auditory_processing > 65:
                        dyslexia_score += (auditory_processing - 65) / 35 * 100
                    
                    # ADHD: Low attention
                    if attention < 45:
                        adhd_score += (45 - attention) / 45 * 100
                    
                    # Autism: High attention + uneven profile
                    if attention > 65:
                        autism_score += (attention - 65) / 35 * 100
                    gap = abs(visual_spatial - working_memory)
                    if gap > 25:
                        autism_score += (gap - 25) / 75 * 100
                    
                    # Select profile with highest score (threshold: 40)
                    if dyslexia_score > 40 and dyslexia_score >= adhd_score and dyslexia_score >= autism_score:
                        flashcard_mode = "dyslexia"
                    elif adhd_score > 40 and adhd_score >= autism_score:
                        flashcard_mode = "adhd"
                    elif autism_score > 40:
                        flashcard_mode = "autism"
                    
                    # Create a readable label for the dropdown
                    student_name = report_data.get("name", "Unknown")
                    age = report_data.get("age", "")
                    label = f"{student_name} - {flashcard_mode.upper()}"
                    if age:
                        label += f" (Age {age})"
                    
                    reports.append({
                        "name": report_name,
                        "label": label,
                        "studentName": student_name,
                        "age": age,
                        "date": report_data.get("date"),
                        "cognitiveScores": cognitive_scores,
                        "mode": flashcard_mode
                    })
                except Exception as e:
                    print(f"Error reading report {json_file}: {e}")
        
        # Sort by date (most recent first) - the timestamp is part of filename
        reports.sort(key=lambda x: x["name"], reverse=True)
        
        return JSONResponse(
            status_code=200,
            content={"ok": True, "reports": reports}
        )
    
    except Exception as e:
        print(f"Error listing reports: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": str(e), "reports": []}
        )


@app.post("/api/course-orchestrate")
async def course_orchestrate(request: Request) -> Any:
    """Generate personalized learning flow based on cognitive profile"""
    global client
    if client is None:
        print("ERROR: Gemini client not initialized")
        return JSONResponse(
            content={
                "error": "Gemini client not initialized",
                "steps": [
                    {"title": "Theory", "desc": "Learn concepts with examples"},
                    {"title": "Quiz", "desc": "Practice with MCQs"},
                    {"title": "Flashcards", "desc": "Revise important terms"},
                    {"title": "Mini Test", "desc": "Check understanding"},
                ],
                "flashcardMode": "general"
            }, 
            status_code=200
        )
    
    try:
        body = await request.json()
    except Exception as e:
        print(f"ERROR parsing request body: {e}")
        body = {}
    
    topic = body.get("topic", "")
    pdf_text = body.get("pdfText", "")
    selected_report = body.get("selectedReport", "")
    language = body.get("language", "en")
    
    input_text = (pdf_text or topic or "").strip()
    
    # Localized default plans for all languages
    default_plans = {
        "en": {
            "steps": [
                {"title": "Theory", "desc": "Learn concepts with examples"},
                {"title": "Quiz", "desc": "Practice with MCQs"},
                {"title": "Flashcards", "desc": "Revise important terms"},
                {"title": "Mini Test", "desc": "Check understanding"},
            ],
            "flashcardMode": "general"
        },
        "ta": {
            "steps": [
                {"title": "கோட்பாடு", "desc": "கருத்துக்களை எடுத்துக்காட்டுகளுடன் கற்க"},
                {"title": "வினா", "desc": "பல்வேறு தேர்வு கேள்விகளுடன் பயிற்சி"},
                {"title": "ஃபிளாஷ்கார்டுகள்", "desc": "முக்கிய சொற்களை மீண்டும் பார்க்க"},
                {"title": "மினி சோதனை", "desc": "புரிதலை சோதிக்க"},
            ],
            "flashcardMode": "general"
        },
        "kn": {
            "steps": [
                {"title": "ಸಿದ್ಧಾಂತ", "desc": "ಉದಾಹರಣೆಗಳೊಂದಿಗೆ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಕಲಿಯಿರಿ"},
                {"title": "ಪ್ರಶ್ನೆ", "desc": "ಬಹು-ಆಯ್ದ ಪ್ರಶ್ನೆಗಳೊಂದಿಗೆ ಅಭ್ಯಾಸ"},
                {"title": "ಫ್ಲ್ಯಾಶ್ಕಾರ್ಡ್ಗಳು", "desc": "ಪ್ರಮುಖ ಪದಗಳನ್ನು ಪುನರಾವಿಷ್ಕರಿಸಿ"},
                {"title": "ಮಿನಿ ಪರೀಕ್ಷೆ", "desc": "ಅರ್ಥವನ್ನು ಪರೀಕ್ಷಿಸಿ"},
            ],
            "flashcardMode": "general"
        },
        "hi": {
            "steps": [
                {"title": "सिद्धांत", "desc": "उदाहरणों के साथ अवधारणाएं सीखें"},
                {"title": "प्रश्नोत्तरी", "desc": "बहु-विकल्प प्रश्नों का अभ्यास करें"},
                {"title": "फ्लैशकार्ड", "desc": "महत्वपूर्ण शब्दों की समीक्षा करें"},
                {"title": "लघु परीक्षा", "desc": "समझ की जांच करें"},
            ],
            "flashcardMode": "general"
        },
        "te": {
            "steps": [
                {"title": "సిద్ధాంతం", "desc": "ఉదాహరణలతో భావనలను నేర్చుకోండి"},
                {"title": "క్విజ్", "desc": "బహుళ-ఎంపిక ప్రశ్నలతో సాధన"},
                {"title": "ఫ్లాష్‌కార్డ్స్", "desc": "ముఖ్యమైన పదాలను సమీక్షించండి"},
                {"title": "మినీ టెస్ట్", "desc": "అవగతను తనిఖీ చేయండి"},
            ],
            "flashcardMode": "general"
        }
    }
    
    default_plan = default_plans.get(language, default_plans["en"])
    
    if not input_text:
        return JSONResponse(content=default_plan, status_code=200)
    
    # Language mapping
    language_instructions = {
        "ta": "Tamil",
        "kn": "Kannada",
        "hi": "Hindi",
        "te": "Telugu",
        "en": "English"
    }
    lang_name = language_instructions.get(language, "English")
    
    # Step titles in different languages
    step_titles = {
        "ta": {"theory": "கோட்பாடு", "quiz": "வினா", "flashcards": "ஃபிளாஷ்கார்டுகள்", "minitest": "மினி சோதனை"},
        "kn": {"theory": "ಸಿದ್ಧಾಂತ", "quiz": "ಪ್ರಶ್ನೆ", "flashcards": "ಫ್ಲ್ಯಾಶ್ಕಾರ್ಡ್ಗಳು", "minitest": "ಮಿನಿ ಪರೀಕ್ಷೆ"},
        "hi": {"theory": "सिद्धांत", "quiz": "प्रश्नोत्तरी", "flashcards": "फ्लैशकार्ड", "minitest": "लघु परीक्षा"},
        "te": {"theory": "సిద్ధాంతం", "quiz": "క్విజ్", "flashcards": "ఫ్లాష్‌కార్డ్స్", "minitest": "మినీ టెస్ట్"},
        "en": {"theory": "Theory", "quiz": "Quiz", "flashcards": "Flashcards", "minitest": "Mini Test"}
    }
    titles = step_titles.get(language, step_titles["en"])
    
    # Load cognitive profile
    profile = None
    if selected_report:
        try:
            reports_dir = BASE_DIR / "reports"
            
            # First try exact match with selected_report
            profile_path = reports_dir / f"{selected_report}.json"
            print(f"Looking for profile at: {profile_path}")
            
            if not profile_path.exists():
                # If not found, look for files that start with selected_report_
                import glob
                matching_files = list(reports_dir.glob(f"{selected_report}_*.json"))
                if matching_files:
                    # Use the most recent one (last alphabetically, which is chronological)
                    profile_path = sorted(matching_files)[-1]
                    print(f"Found profile at: {profile_path}")
            
            if profile_path.exists():
                with open(profile_path, 'r') as f:
                    profile = json.load(f)
                print(f"Loaded profile: {profile}")
            else:
                print(f"Profile not found at {profile_path}")
        except Exception as e:
            print(f"Error loading profile: {e}")
            traceback.print_exc()
    
    # Determine flashcard mode based on cognitive scores
    flashcard_mode = "general"
    if profile and profile.get("cognitiveScores"):
        scores = profile["cognitiveScores"]
        attention = scores.get("attention", 50)
        visual_spatial = scores.get("visualSpatial", 50)
        working_memory = scores.get("workingMemory", 50)
        auditory_processing = scores.get("auditoryProcessing", 50)
        
        print(f"Cognitive scores - attention: {attention}, visualSpatial: {visual_spatial}, workingMemory: {working_memory}, auditoryProcessing: {auditory_processing}")
        
        # Calculate match scores for each profile
        dyslexia_score = 0
        adhd_score = 0
        autism_score = 0
        
        # Dyslexia: Low visual-spatial + High auditory (compensatory strength)
        if visual_spatial < 45:
            dyslexia_score += (45 - visual_spatial) / 45 * 100
        if auditory_processing > 65:
            dyslexia_score += (auditory_processing - 65) / 35 * 100
        
        # ADHD: Low attention + inconsistent performance
        if attention < 45:
            adhd_score += (45 - attention) / 45 * 100
        
        # Autism: High attention to detail + uneven cognitive profile
        if attention > 65:
            autism_score += (attention - 65) / 35 * 100
        gap = abs(visual_spatial - working_memory)
        if gap > 25:
            autism_score += (gap - 25) / 75 * 100
        
        print(f"Profile scores - Dyslexia: {dyslexia_score:.1f}, ADHD: {adhd_score:.1f}, Autism: {autism_score:.1f}")
        
        # Select the profile with highest score (minimum threshold: 40)
        if dyslexia_score > 40 and dyslexia_score >= adhd_score and dyslexia_score >= autism_score:
            flashcard_mode = "dyslexia"
            print(f"Selected DYSLEXIA mode (score={dyslexia_score:.1f}, visualSpatial={visual_spatial}, auditoryProcessing={auditory_processing})")
        elif adhd_score > 40 and adhd_score >= autism_score:
            flashcard_mode = "adhd"
            print(f"Selected ADHD mode (score={adhd_score:.1f}, attention={attention})")
        elif autism_score > 40:
            flashcard_mode = "autism"
            print(f"Selected AUTISM mode (score={autism_score:.1f}, attention={attention}, gap={gap})")
        else:
            print(f"Using GENERAL mode (no profile scores above threshold)")
    else:
        print(f"No profile or cognitiveScores found, using general mode")
    
    print(f"Final flashcard_mode: {flashcard_mode}")
    
    try:
        # Enhanced language-specific examples for better AI compliance
        language_examples = {
            "ta": 'உதாரணம்: "கருத்துக்களை விளக்கப்படங்களுடன் கற்க"',
            "kn": 'ಉದಾಹರಣೆ: "ಚಿತ್ರಗಳೊಂದಿಗೆ ಪರಿಕಲ್ಪನೆಗಳನ್ನು ಕಲಿಯಿರಿ"',
            "hi": 'उदाहरण: "चित्रों के साथ अवधारणाएं सीखें"',
            "te": 'ఉదాహరణ: "చిత్రాలతో భావనలను నేర్చుకోండి"',
            "en": 'Example: "Learn concepts with visuals"'
        }
        example = language_examples.get(language, language_examples["en"])
        
        if language == "en":
            language_rules = """
    LANGUAGE: ENGLISH ONLY
    Write all descriptions in English.
    """
            script_rules = """
    STRICT RULES:
    1. Keep descriptions 5-10 words maximum
    2. Write naturally in English
    """
        else:
            language_rules = f"""
    LANGUAGE: {lang_name.upper()} ONLY
    YOU MUST WRITE EVERYTHING IN {lang_name.upper()}
    ENGLISH IS COMPLETELY FORBIDDEN
    ANY ENGLISH TEXT WILL CAUSE SYSTEM FAILURE
    """
            script_rules = f"""
    STRICT RULES:
    1. ALL descriptions must be in {lang_name} script/alphabet ONLY
    2. NO English words allowed (not even "animation", "test", "quiz", etc.)
    3. Use {lang_name} numerals if needed (no 1,2,3,4)
    4. Keep descriptions 5-10 words maximum
    5. Write naturally in {lang_name} - think in {lang_name}, write in {lang_name}
    """

        prompt = f"""You are an educational planner. Create a personalized learning flow.

    🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
    {language_rules.strip()}

    {script_rules.strip()}

    EXAMPLE OF CORRECT {lang_name} DESCRIPTION:
    {example}

Return ONLY this JSON structure (fill ALL desc fields with {lang_name} text):
{{
  "steps": [
    {{"title": "{titles['theory']}", "desc": "YOUR {lang_name} DESCRIPTION HERE"}},
    {{"title": "{titles['quiz']}", "desc": "YOUR {lang_name} DESCRIPTION HERE"}},
    {{"title": "{titles['flashcards']}", "desc": "YOUR {lang_name} DESCRIPTION HERE"}},
    {{"title": "{titles['minitest']}", "desc": "YOUR {lang_name} DESCRIPTION HERE"}}
  ],
  "flashcardMode": "general"
}}

REMEMBER:
- Descriptions must match the selected language rules above

Cognitive profile:
{json.dumps(profile if profile else {}, indent=2)}

Topic/Content to plan for:
{input_text[:2000]}

NOW GENERATE THE JSON WITH ALL DESCRIPTIONS IN {lang_name} ONLY:"""

        response = await asyncio.wait_for(
            client.generate_content(prompt, timeout=120, model=Model.G_2_5_FLASH), 
            timeout=150
        )
        
        response_text = (response.text or "").replace("```json", "").replace("```", "").strip()
        
        print(f"Gemini response (first 500 chars): {response_text[:500]}")
        
        # Extract JSON
        json_match = response_text.find("{")
        if json_match >= 0:
            json_str = response_text[json_match:]
            json_end = json_str.rfind("}")
            if json_end >= 0:
                json_str = json_str[:json_end + 1]
                plan = json.loads(json_str)
                
                # Override flashcardMode with profile-based selection
                plan["flashcardMode"] = flashcard_mode
                
                # Validate steps
                if not isinstance(plan.get("steps"), list) or len(plan["steps"]) != 4:
                    plan["steps"] = default_plan["steps"]
                
                print(f"Final response: {json.dumps(plan)}")
                return JSONResponse(content=plan, status_code=200)
        
        # Fallback to default with correct flashcard mode
        default_plan["flashcardMode"] = flashcard_mode
        print(f"Returning default plan: {json.dumps(default_plan)}")
        return JSONResponse(content=default_plan, status_code=200)
        
    except Exception as e:
        print(f"Error in course orchestration: {e}")
        traceback.print_exc()
        default_plan["flashcardMode"] = flashcard_mode
        return JSONResponse(content=default_plan, status_code=200)



@app.post("/api/get-report")
async def get_report(request: Request) -> Any:
    """Get cognitive profile from a report file"""
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    report_name = body.get("reportName", "")
    
    if not report_name:
        return JSONResponse(
            content={"error": "Missing reportName", "profile": None},
            status_code=400
        )
    
    try:
        reports_dir = BASE_DIR / "backend" / "reports"
        
        # First try exact match
        profile_path = reports_dir / f"{report_name}.json"
        
        if not profile_path.exists():
            # If not found, look for files that start with report_name_
            import glob
            matching_files = list(reports_dir.glob(f"{report_name}_*.json"))
            if matching_files:
                profile_path = sorted(matching_files)[-1]
        
        if profile_path.exists():
            with open(profile_path, 'r') as f:
                profile = json.load(f)
            return JSONResponse(
                content={"profile": profile, "error": None},
                status_code=200
            )
        else:
            return JSONResponse(
                content={"error": f"Report not found: {report_name}", "profile": None},
                status_code=404
            )
    except Exception as e:
        print(f"Error loading report: {e}")
        traceback.print_exc()
        return JSONResponse(
            content={"error": str(e), "profile": None},
            status_code=500
        )





@app.get("/student/{student_id}")
def get_student(student_id: int):
    if student_id not in students_db:
        return {"error": "Student not found"}

    return students_db[student_id]




@app.post("/api/mini-test")
async def mini_test(request: Request):
    global client
    if client is None:
        raise HTTPException(status_code=500, detail="Gemini client not initialized")

    try:
        body = await request.json()
    except Exception:
        body = {}

    theory = body.get("theory")
    topic = body.get("topic", "General Topic")
    cognitive_profile = body.get("cognitiveProfile") or {}  # ✅ FIX HERE

    if not theory:
        raise HTTPException(status_code=400, detail="Missing theory content")

    theory_truncated = theory[:3000]

    profile_context = ""
    scores = cognitive_profile.get("cognitiveScores", {})
    if scores:
        profile_context = f"""
Student's Cognitive Profile:
- Visual Spatial: {scores.get('visualSpatial')}
- Working Memory: {scores.get('workingMemory')}
- Attention: {scores.get('attention')}
Adjust difficulty accordingly.
"""

    prompt = f"""
Based on this theory content:

{theory_truncated}

Generate exactly 5 open-ended questions.
IMPORTANT: Return ONLY a valid JSON array.

{profile_context}

Format:
[
  {{
    "question": "Clear question text",
    "answer": "Correct answer",
    "explanation": "Brief explanation"
  }}
]
"""

    max_retries = 3
    retry_delay = 2

    for attempt in range(max_retries):
        try:
            response = await asyncio.wait_for(
                client.generate_content(prompt, model=Model.G_2_5_FLASH),
                timeout=60
            )

            raw = (response.text or "").strip().replace("```json", "").replace("```", "")
            start, end = raw.find("["), raw.rfind("]")
            questions = json.loads(raw[start:end+1])

            cleaned = [{
                "question": q["question"],
                "answer": q.get("answer", ""),
                "explanation": q.get("explanation", "")
            } for q in questions if "question" in q]

            return JSONResponse({"questions": cleaned}, status_code=200)

        except Exception as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay)
                continue
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    raise HTTPException(status_code=500, detail="Failed after retries")
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
bar_x = 210
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

students_db = {
    1: {
        "name": "Chaitra",
        "age": 11,
        "date": "2026-02-03T09:17:50.497Z",
        "cognitiveScores": {
            "visualSpatial": 44,
            "workingMemory": 0,
            "reactionTime": 60,
            "attention": 0,
            "auditoryProcessing": 0,
            "reasoning": 0
        }
    }
}

@app.get("/student/{student_id}")
def get_student(student_id: int):
    if student_id not in students_db:
        return {"error": "Student not found"}
    return students_db[student_id]