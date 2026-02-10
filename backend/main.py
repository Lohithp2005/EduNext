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
from typing import Any
import uuid
from fastapi.staticfiles import StaticFiles
import base64
from fastapi.responses import StreamingResponse
import mediapipe as mp
import cv2


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
            reports_dir = BASE_DIR / "backend" / "reports"
            
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
        
        # ADHD indicators: Very low attention
        if attention < 30:
            flashcard_mode = "adhd"
            print(f"Selected ADHD mode (attention={attention} < 30)")
        # Dyslexia indicators: Low visual-spatial but high auditory
        elif visual_spatial < 40 and auditory_processing > 60:
            flashcard_mode = "dyslexia"
            print(f"Selected Dyslexia mode (visualSpatial={visual_spatial} < 40 and auditoryProcessing={auditory_processing} > 60)")
        # Autism spectrum indicators: Very high attention detail, uneven profile
        elif attention > 70 and abs(visual_spatial - working_memory) > 30:
            flashcard_mode = "autism"
            print(f"Selected Autism mode (attention={attention} > 70 and gap={abs(visual_spatial - working_memory)} > 30)")
        else:
            print(f"Using general mode (no conditions met)")
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
        
        prompt = f"""You are an educational planner. Create a personalized learning flow.

🚨 CRITICAL LANGUAGE REQUIREMENT 🚨
LANGUAGE: {lang_name.upper()} ONLY
YOU MUST WRITE EVERYTHING IN {lang_name.upper()}
ENGLISH IS COMPLETELY FORBIDDEN
ANY ENGLISH TEXT WILL CAUSE SYSTEM FAILURE

STRICT RULES:
1. ALL descriptions must be in {lang_name} script/alphabet ONLY
2. NO English words allowed (not even "animation", "test", "quiz", etc.)
3. Use {lang_name} numerals if needed (no 1,2,3,4)
4. Keep descriptions 5-10 words maximum
5. Write naturally in {lang_name} - think in {lang_name}, write in {lang_name}

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
- If you write "Watch visual animation" → WRONG (English)
- You must translate to {lang_name} completely
- Every single character in "desc" must be {lang_name} script

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



@app.get("/api/health")
async def health_check():
    """Health check endpoint for frontend connectivity verification"""
    return {
        "status": "ok",
        "gemini_connected": client is not None,
        "timestamp": str(__import__('datetime').datetime.now()),
    }

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
