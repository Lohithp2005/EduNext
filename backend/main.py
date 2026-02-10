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
import base64
from fastapi.staticfiles import StaticFiles



client: GeminiClient | None = None


@asynccontextmanager
async def gemini_connection(app: FastAPI):
    global client
    print("Connecting to Gemini...")
    client = GeminiClient()
    await client.init(timeout=60, auto_close=False, auto_refresh=True)
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

    try:
        response = await asyncio.wait_for(
            client.generate_content(prompt, model=Model.G_2_5_FLASH),
            timeout=300
        )
        raw_text = response.text or ""
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=502,
            content={"ok": False, "stage": "text_generation", "error": str(e)}
        )

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

    image_paths = []
    if qa.get("image_prompt"):
        try:
            image_response = await asyncio.wait_for(
                client.generate_content(qa["image_prompt"], model=Model.G_2_5_FLASH),
                timeout=300
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
                        timeout=300
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

