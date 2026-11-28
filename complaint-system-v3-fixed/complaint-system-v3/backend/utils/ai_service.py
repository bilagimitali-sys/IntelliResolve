"""
KLE Technological University — Grievance Intelligence Service
Dual-Engine AI Pipeline:
  Engine A: Real LLM API (Gemini / Groq / OpenAI if configured, else free keyless OVHcloud & Pollinations AI)
  Engine B: Intent-aware Smart Campus Assistant & Heuristic NLP (offline fallback)
"""

from __future__ import annotations

import itertools
import json
import re
from typing import Any

import httpx

import config

# ── 1. KLE TECH KNOWLEDGE BASE ────────────────────────────────
DEPARTMENTS: list[dict[str, Any]] = [
    {"id": 1, "code": "CSE", "name": "Computer Science & Engineering", "hod": "Dr. HoD CSE", "email": "hod.cse@kletech.ac.in", "icon": "💻", "keywords": ["cse", "computer science", "programming", "coding", "lab workstation", "software", "cloud", "linux lab", "server", "compiler", "ai lab", "system crash"]},
    {"id": 2, "code": "ISE", "name": "Information Science & Engineering", "hod": "Dr. HoD ISE", "email": "hod.ise@kletech.ac.in", "icon": "🖥️", "keywords": ["ise", "information science", "software engineering", "web tech lab", "database lab"]},
    {"id": 3, "code": "ECE", "name": "Electronics & Communication Engg", "hod": "Dr. HoD ECE", "email": "hod.ece@kletech.ac.in", "icon": "📡", "keywords": ["ece", "electronics", "communication", "vlsi", "signal", "embedded", "oscilloscope", "circuit board", "sensor"]},
    {"id": 4, "code": "EEE", "name": "Electrical & Electronics Engg", "hod": "Dr. HoD EEE", "email": "hod.eee@kletech.ac.in", "icon": "⚡", "keywords": ["eee", "electrical", "transformer", "high voltage", "motor lab", "power grid", "switchgear", "short circuit"]},
    {"id": 5, "code": "MECH", "name": "Mechanical Engineering", "hod": "Dr. HoD Mech", "email": "hod.mech@kletech.ac.in", "icon": "⚙️", "keywords": ["mech", "mechanical", "workshop", "lathe", "welding", "cad", "cam", "cnc", "machine tool", "fluid mechanics"]},
    {"id": 6, "code": "CIVIL", "name": "Civil Engineering", "hod": "Dr. HoD Civil", "email": "hod.civil@kletech.ac.in", "icon": "🏗️", "keywords": ["civil", "surveying", "concrete", "soil mechanics", "hydraulics", "structural", "construction", "building defect"]},
    {"id": 7, "code": "CHEM", "name": "Chemical Engineering", "hod": "Dr. HoD Chem", "email": "hod.chem@kletech.ac.in", "icon": "🧪", "keywords": ["chem", "chemical", "reaction", "distillation", "mass transfer", "chemistry lab", "acid", "fume hood"]},
    {"id": 8, "code": "BT", "name": "Biotechnology", "hod": "Dr. HoD BT", "email": "hod.bt@kletech.ac.in", "icon": "🧬", "keywords": ["bt", "biotech", "biotechnology", "microbiology", "bioinformatics", "genetics", "incubator", "specimen"]},
    {"id": 9, "code": "MATH", "name": "Mathematics", "hod": "Dr. HoD Math", "email": "hod.math@kletech.ac.in", "icon": "📐", "keywords": ["math", "mathematics", "calculus", "algebra", "statistics", "differential equation"]},
    {"id": 10, "code": "PHY", "name": "Physics", "hod": "Dr. HoD Physics", "email": "hod.phy@kletech.ac.in", "icon": "🔬", "keywords": ["phy", "physics", "optics", "laser", "dark room", "spectrometer", "physics lab"]},
    {"id": 11, "code": "MBA", "name": "MBA", "hod": "Dr. Director MBA", "email": "director.mba@kletech.ac.in", "icon": "📊", "keywords": ["mba", "management", "business", "marketing", "finance lecture", "case study room"]},
    {"id": 12, "code": "MCA", "name": "MCA", "hod": "Dr. HoD MCA", "email": "hod.mca@kletech.ac.in", "icon": "🎓", "keywords": ["mca", "master of computer applications", "mca lab"]},
    {"id": 13, "code": "LIB", "name": "Library", "hod": "Chief Librarian", "email": "librarian@kletech.ac.in", "icon": "📚", "keywords": ["library", "books", "book", "reading room", "journal", "digital library", "fine", "librarian", "borrow", "return book", "id card scan"]},
    {"id": 14, "code": "HSTEL", "name": "Hostel / Accommodation", "hod": "Warden", "email": "warden@kletech.ac.in", "icon": "🏠", "keywords": ["hostel", "mess", "food", "room", "warden", "hot water", "geyser", "washroom", "hostel water", "block a", "block b", "block c", "hostel wifi", "mess food", "caterer", "insects in food"]},
    {"id": 15, "code": "EXAM", "name": "Examination Cell", "hod": "Controller of Exams", "email": "examcell@kletech.ac.in", "icon": "📝", "keywords": ["exam", "examination", "hall ticket", "marksheet", "grade card", "revaluation", "re-exam", "internal marks", "seating", "backlog", "result delay", "transcript"]},
    {"id": 16, "code": "FIN", "name": "Finance & Accounts", "hod": "Finance Officer", "email": "finance@kletech.ac.in", "icon": "💰", "keywords": ["fee", "fees", "tuition", "challan", "receipt", "refund", "scholarship", "finance", "payment failure", "accounts counter", "bank draft"]},
    {"id": 17, "code": "IT", "name": "IT & Technical Support", "hod": "IT Manager", "email": "itsupport@kletech.ac.in", "icon": "🔧", "keywords": ["wifi", "wi-fi", "campus wifi", "internet", "portal", "moodle", "login issue", "projector", "smart board", "sound system", "audio speaker", "lan cable", "firewall"]},
    {"id": 18, "code": "SPORTS", "name": "Sports & Physical Education", "hod": "Sports Director", "email": "sports@kletech.ac.in", "icon": "🏃", "keywords": ["sports", "gym", "ground", "badminton court", "basketball", "cricket", "football", "fitness equipment", "coach", "sports kit"]},
    {"id": 19, "code": "PLCMT", "name": "Placement Cell", "hod": "Placement Officer", "email": "placements@kletech.ac.in", "icon": "🤝", "keywords": ["placement", "interview", "internship", "company drive", "aptitude", "tpo", "training & placement", "campus interview"]},
    {"id": 20, "code": "DEAN", "name": "Dean of Students", "hod": "Dean of Students", "email": "dean.students@kletech.ac.in", "icon": "🏛️", "keywords": ["dean", "student welfare", "discipline", "cultural", "fest", "club", "student council", "extracurricular"]},
]

BUSES: list[dict[str, Any]] = [
    {"id": 1, "number": "KA-22-F-1024 (Bus #01)", "short": "Bus #01", "driver": "Mallikarjun Patil", "phone": "+91 94481 23401", "capacity": 52},
    {"id": 2, "number": "KA-22-F-1025 (Bus #02)", "short": "Bus #02", "driver": "Suresh Jadhav", "phone": "+91 94481 23402", "capacity": 48},
    {"id": 3, "number": "KA-22-F-1026 (Bus #03)", "short": "Bus #03", "driver": "Basavaraj Hiremath", "phone": "+91 94481 23403", "capacity": 55},
    {"id": 4, "number": "KA-22-F-1027 (Bus #04)", "short": "Bus #04", "driver": "Gopal Hegde", "phone": "+91 94481 23404", "capacity": 50},
]

ROUTES: list[dict[str, Any]] = [
    {
        "id": 1,
        "number": "R-01",
        "name": "Belagavi Central Bus Terminal (CBT) to Campus",
        "morning": "07:45 AM - 08:30 AM",
        "evening": "04:45 PM - 05:30 PM",
        "stops": ["CBT", "Bogarves", "Goaves", "3rd Gate", "Third Gate", "Udyambag Campus"],
        "keywords": ["cbt", "central bus stand", "bogarves", "goaves", "3rd gate", "third gate", "r-01", "route 1", "route r-01"],
    },
    {
        "id": 2,
        "number": "R-02",
        "name": "RPD Cross / Tilakwadi to Campus",
        "morning": "08:00 AM - 08:35 AM",
        "evening": "04:45 PM - 05:25 PM",
        "stops": ["RPD Cross", "Congress Road", "2nd Gate", "Second Gate", "Angol", "Udyambag Campus"],
        "keywords": ["rpd", "rpd cross", "tilakwadi", "congress road", "2nd gate", "second gate", "angol", "r-02", "route 2", "route r-02"],
    },
    {
        "id": 3,
        "number": "R-03",
        "name": "Belagavi Railway Station to Campus",
        "morning": "07:50 AM - 08:40 AM",
        "evening": "04:50 PM - 05:40 PM",
        "stops": ["Railway Station", "Chennamma Circle", "Club Road", "Camp", "Udyambag Campus"],
        "keywords": ["railway station", "station", "chennamma circle", "club road", "camp", "r-03", "route 3", "route r-03"],
    },
    {
        "id": 4,
        "number": "R-04",
        "name": "Vadgaon / Shahapur to Campus",
        "morning": "08:05 AM - 08:40 AM",
        "evening": "04:40 PM - 05:15 PM",
        "stops": ["Shahapur Gate", "Khasbag", "Basavan Galli", "Old Belagavi", "Udyambag Campus"],
        "keywords": ["vadgaon", "shahapur", "shahapur gate", "khasbag", "basavan galli", "old belagavi", "r-04", "route 4", "route r-04"],
    },
]

# Keyless free OVHcloud models (2 RPM per model -> rotating avoids 429)
_OVH_MODELS = [
    "Meta-Llama-3_3-70B-Instruct",
    "Mistral-Small-3.2-24B-Instruct-2506",
    "Qwen3.5-9B",
    "gemma-4-26b-a4b",
    "gpt-oss-20b",
    "DeepSeek-V4.1-Flash-1017",
]
_ovh_cycle = itertools.cycle(_OVH_MODELS)

# ── 2. SAFETY & HAZARD PATTERNS ──────────────────────────────
SAFETY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(harass|harassed|harassment|ragging|ragged|bully|bullied|bullying|molest|molested|molestation|touching|inappropriate touch|stalking|stalked)\b", re.IGNORECASE), "Physical Safety & Anti-Ragging Alert"),
    (re.compile(r"\b(accident|crashed|collision|hit|injured|injury|bleeding|ambulance|fracture|hospital)\b", re.IGNORECASE), "Accident & Physical Injury Alert"),
    (re.compile(r"\b(rash driving|drunk|drunk driving|overspeeding|reckless driving|brake failure|brakes failed|tire burst|wheel came off|door open while moving|footboard)\b", re.IGNORECASE), "Transit Operational Safety Hazard"),
    (re.compile(r"\b(fire|short circuit|electric shock|cylinder leak|gas leak|sparking|sparks|chemical spill|acid burn)\b", re.IGNORECASE), "Fire & Electrical Hazard"),
    (re.compile(r"\b(fight|assault|assaulted|beaten|threatened|weapon|violence|knife|attacked)\b", re.IGNORECASE), "Violence & Personal Security Threat"),
    (re.compile(r"\b(medical emergency|fainted|unconscious|heart attack|suicide|self harm|poisoning|food poisoning|contaminated water)\b", re.IGNORECASE), "Critical Health & Medical Emergency"),
]


def detect_safety_hazard(text: str | None) -> dict[str, Any]:
    """Detect safety hazards and emergency keywords in complaint text."""
    if not text:
        return {"isHazard": False, "reason": None, "priority": "Low"}
    for pattern, reason in SAFETY_PATTERNS:
        match = pattern.search(text)
        if match:
            return {
                "isHazard": True,
                "reason": f'{reason} (Keyword: "{match.group(0)}")',
                "priority": "Critical",
            }
    return {"isHazard": False, "reason": None, "priority": "Low"}


# ── 3. REAL MULTI-PROVIDER LLM CLIENT ────────────────────────
def get_ai_provider_status() -> dict[str, Any]:
    """Return active real-LLM configuration status."""
    if config.GEMINI_API_KEY:
        return {"configured": True, "provider": "gemini", "model": config.GEMINI_MODEL}
    if config.GROQ_API_KEY:
        return {"configured": True, "provider": "groq", "model": config.GROQ_MODEL}
    if config.OPENAI_API_KEY:
        return {"configured": True, "provider": "openai", "model": config.OPENAI_MODEL}
    if config.FREE_LLM_ENABLED:
        return {"configured": True, "provider": "cloud-llm", "model": "Llama-3.3-70B / Pollinations"}
    return {"configured": False, "provider": "local", "model": "kle-campus-assistant"}


def _clean_json_block(raw: str) -> str:
    cleaned = re.sub(r"```json|```", "", raw, flags=re.IGNORECASE).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        return cleaned[start : end + 1]
    return cleaned


async def call_gemini(prompt: str, model: str | None = None, expect_json: bool = False) -> str | None:
    """Call Google Gemini REST API if GEMINI_API_KEY is configured."""
    api_key = config.GEMINI_API_KEY
    if not api_key:
        return None

    models_to_try = list(
        dict.fromkeys(
            [
                model or config.GEMINI_MODEL,
                "gemini-2.5-flash",
                "gemini-2.5-flash-lite",
                "gemini-2.0-flash",
            ]
        )
    )
    gen_config: dict[str, Any] = {
        "temperature": 0.25 if not expect_json else 0.15,
        "topP": 0.9,
        "maxOutputTokens": 1200,
    }
    if expect_json:
        gen_config["responseMimeType"] = "application/json"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": gen_config,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for target_model in models_to_try:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={api_key}"
                resp = await client.post(url, json=payload)
                if 200 <= resp.status_code < 300:
                    data = resp.json()
                    text_resp = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text")
                    )
                    if text_resp:
                        return text_resp
                else:
                    print(f"[AI] Gemini {target_model} HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as exc:
                print(f"[AI] Gemini {target_model} error: {exc}")
                continue
    return None


async def _call_openai_compatible(
    base_url: str,
    api_key: str | None,
    models: list[str],
    prompt: str,
    system_prompt: str = "",
    expect_json: bool = False,
    allow_response_format: bool = True,
) -> str | None:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    messages: list[dict[str, str]] = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    async with httpx.AsyncClient(timeout=18.0) as client:
        for target_model in models:
            try:
                body: dict[str, Any] = {
                    "model": target_model,
                    "messages": messages,
                    "temperature": 0.25 if not expect_json else 0.15,
                    "max_tokens": 1200,
                }
                if expect_json and allow_response_format:
                    body["response_format"] = {"type": "json_object"}
                endpoint = base_url.rstrip("/")
                if not endpoint.endswith("/chat/completions") and not endpoint.endswith("/openai"):
                    endpoint = f"{endpoint}/chat/completions"
                resp = await client.post(endpoint, headers=headers, json=body)
                if 200 <= resp.status_code < 300:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content")
                    if content:
                        return content
                else:
                    print(f"[AI] Provider {target_model} HTTP {resp.status_code}: {resp.text[:160]}")
            except Exception as exc:
                print(f"[AI] Provider {target_model} error: {exc}")
                continue
    return None


async def call_llm(prompt: str, system_prompt: str = "", expect_json: bool = False) -> tuple[str | None, str]:
    """Call configured LLM API (Gemini / Groq / OpenAI), or keyless OVHcloud / Pollinations."""
    full_prompt = f"{system_prompt}\n\n{prompt}".strip() if system_prompt else prompt

    if config.GEMINI_API_KEY:
        res = await call_gemini(full_prompt, expect_json=expect_json)
        if res:
            return res, "gemini"

    if config.GROQ_API_KEY:
        res = await _call_openai_compatible(
            base_url="https://api.groq.com/openai/v1/chat/completions",
            api_key=config.GROQ_API_KEY,
            models=list(dict.fromkeys([config.GROQ_MODEL, "llama-3.3-70b-versatile", "llama-3.1-8b-instant"])),
            prompt=prompt,
            system_prompt=system_prompt,
            expect_json=expect_json,
        )
        if res:
            return res, "groq"

    if config.OPENAI_API_KEY:
        res = await _call_openai_compatible(
            base_url=config.OPENAI_BASE_URL,
            api_key=config.OPENAI_API_KEY,
            models=[config.OPENAI_MODEL],
            prompt=prompt,
            system_prompt=system_prompt,
            expect_json=expect_json,
        )
        if res:
            return res, "openai"

    if config.FREE_LLM_ENABLED:
        # 1. Keyless OVHcloud AI Endpoints (rotate across models for 2 RPM/model headroom)
        first_model = next(_ovh_cycle)
        ovh_try = [first_model, next(_ovh_cycle), next(_ovh_cycle)]
        res = await _call_openai_compatible(
            base_url="https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/chat/completions",
            api_key=None,
            models=ovh_try,
            prompt=prompt,
            system_prompt=system_prompt,
            expect_json=expect_json,
            allow_response_format=False,
        )
        if res:
            return res, "ovh-cloud"

        # 2. Keyless Pollinations AI fallback
        res = await _call_openai_compatible(
            base_url="https://text.pollinations.ai/openai",
            api_key=None,
            models=["openai", "mistral"],
            prompt=prompt,
            system_prompt=system_prompt,
            expect_json=expect_json,
            allow_response_format=False,
        )
        if res:
            return res, "pollinations"

    return None, "local"


# ── 4. HEURISTIC NLP STRUCTURING (Engine B) ───────────────────
_TIME_REGEX = re.compile(
    r"\b(today|yesterday|tomorrow|this morning|last evening|night|morning|afternoon|"
    r"\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\w+)?|\d{4})\b",
    re.IGNORECASE,
)
_LOC_REGEX = re.compile(
    r"\b(campus|cbt|rpd|rpd cross|tilakwadi|shahapur|vadgaon|railway station|chennamma circle|"
    r"3rd gate|2nd gate|bogarves|goaves|angol|khasbag|hostel|mess|library|canteen|ground|gym|"
    r"block\s*[a-z0-9]+|room\s*\d+|lab\s*\d+|audi|auditorium|seminar hall|tech park|classroom|bus\s*#?\d+)\b",
    re.IGNORECASE,
)
_IMPACT_REGEX = re.compile(
    r"\b(missed|late|unable|couldn't|delayed|stuck|suffering|problem|inconvenience|danger|"
    r"disturbed|cannot attend|penalty|fine|unusable)\b",
    re.IGNORECASE,
)
_ACTION_REGEX = re.compile(
    r"\b(fix|repair|replace|refund|reschedule|change driver|action against|inspect|clean|service|warning|penalty)\b",
    re.IGNORECASE,
)


def heuristic_refine(text: str | None) -> dict[str, Any]:
    """Structure raw complaint text deterministically without hallucinating facts."""
    clean = (text or "").strip()
    if not clean:
        return {
            "suggested_title": "Unspecified Grievance",
            "what_happened": "No details submitted.",
            "when_and_where": "[Not provided by student]",
            "impact": "[Not provided by student]",
            "requested_action": "Investigation and prompt resolution.",
            "formatted_description": "No details submitted.",
            "is_heuristic": True,
        }

    time_matches = [m.group(0) for m in _TIME_REGEX.finditer(clean) if m.group(0).strip()]
    unique_times = list(dict.fromkeys(time_matches))[:3]
    time_extracted = ", ".join(unique_times) if unique_times else "[Not provided by student]"

    loc_matches = [m.group(0) for m in _LOC_REGEX.finditer(clean) if m.group(0).strip()]
    unique_locs = list(dict.fromkeys(loc_matches))[:4]
    loc_extracted = ", ".join(unique_locs) if unique_locs else "[Not provided by student]"

    title = re.split(r"[.?!;\n]", clean)[0].strip()
    if len(title) > 70:
        title = title[:67] + "..."
    if not title:
        title = "Grievance Report"

    impact = "[Not provided by student]"
    if _IMPACT_REGEX.search(clean):
        impact = "Caused operational disturbance, academic disruption, or student inconvenience."

    requested_action = "Timely investigation and corrective resolution by the university administration."
    if _ACTION_REGEX.search(clean):
        requested_action = "Requested urgent inspection, maintenance or administrative remediation with confirmation."

    when_where = f"Time: {time_extracted} | Location/Transit: {loc_extracted}"
    formatted = "\n\n".join(
        [
            f"【What Happened】: {clean}",
            f"【When & Where】: {when_where}",
            f"【Impact】: {impact}",
            f"【Requested Action】: {requested_action}",
        ]
    )

    return {
        "suggested_title": title,
        "what_happened": clean,
        "when_and_where": when_where,
        "impact": impact,
        "requested_action": requested_action,
        "formatted_description": formatted,
        "is_heuristic": True,
    }


# ── 5. INTELLIGENT ROUTING & CLASSIFICATION ENGINE ────────────
_TRANSPORT_REGEX = re.compile(
    r"\b(bus|buses|route|routes|driver|conductor|transit|fleet|cbt|rpd|tilakwadi|shahapur|vadgaon|"
    r"railway station|station|goaves|bogarves|3rd gate|third gate|2nd gate|second gate|angol|khasbag|"
    r"chennamma circle|overcrowd|overcrowding|puncture|breakdown|rash driving|seat|bus stop)\b",
    re.IGNORECASE,
)


def heuristic_route(text: str | None) -> dict[str, Any]:
    """Deterministic zero-latency campus grievance router."""
    clean = (text or "").strip()
    safety = detect_safety_hazard(clean)
    lower = clean.lower()

    if _TRANSPORT_REGEX.search(lower):
        matched_route = next((r for r in ROUTES if any(k in lower for k in r["keywords"])), None)

        matched_bus = None
        if re.search(r"\b(bus\s*#?1|bus\s*01|bus\s*#01|1024)\b", lower):
            matched_bus = BUSES[0]
        elif re.search(r"\b(bus\s*#?2|bus\s*02|bus\s*#02|1025)\b", lower):
            matched_bus = BUSES[1]
        elif re.search(r"\b(bus\s*#?3|bus\s*03|bus\s*#03|1026)\b", lower):
            matched_bus = BUSES[2]
        elif re.search(r"\b(bus\s*#?4|bus\s*04|bus\s*#04|1027)\b", lower):
            matched_bus = BUSES[3]

        complaint_type = "route_issue"
        if safety["isHazard"] or re.search(r"\b(accident|rash driving|drunk|brake failure|harass)\b", lower):
            complaint_type = "safety"
        elif re.search(r"\b(late|delay|delayed|wait|time|schedule|punctuality)\b", lower):
            complaint_type = "delay"
        elif re.search(r"\b(driver|conductor|behaviour|rude|talk|shout|conduct|abused)\b", lower):
            complaint_type = "driver_behaviour"
        elif re.search(r"\b(clean|dirty|trash|garbage|dust|smell|seat torn)\b", lower):
            complaint_type = "cleanliness"
        elif re.search(r"\b(crowd|packed|standing|overcrowd|space|no seat)\b", lower):
            complaint_type = "overcrowding"
        elif re.search(r"\b(breakdown|puncture|engine|smoke|window|door|repair|ac not working)\b", lower):
            complaint_type = "maintenance"

        priority = "Critical" if safety["isHazard"] else ("High" if re.search(r"\b(urgent|immediate|danger|emergency|today)\b", lower) else "Medium")
        route_text = f"Route {matched_route['number']} ({matched_route['name']})" if matched_route else "Campus Transit Network"
        bus_text = f"on {matched_bus['short']}" if matched_bus else ""

        return {
            "target_module": "transportation",
            "department_id": None,
            "department_code": None,
            "department_name": None,
            "department_icon": None,
            "bus_id": matched_bus["id"] if matched_bus else None,
            "bus_number": matched_bus["number"] if matched_bus else None,
            "route_id": matched_route["id"] if matched_route else None,
            "route_number": matched_route["number"] if matched_route else None,
            "route_name": matched_route["name"] if matched_route else None,
            "suggested_category": "Transportation",
            "bus_complaint_type": complaint_type,
            "suggested_priority": priority,
            "is_safety_hazard": safety["isHazard"],
            "safety_reason": safety["reason"],
            "sentiment_score": -0.85 if safety["isHazard"] else -0.35,
            "confidence": 0.94 if (matched_route or matched_bus) else 0.85,
            "routing_reason": f"Intelligently routed to Campus Bus Coordinator for {route_text} {bus_text}.".strip(),
            "is_heuristic": True,
            "ai_provider": "local",
        }

    best_dept = None
    best_dept_score = 0
    for dept in DEPARTMENTS:
        score = 0
        if dept["code"].lower() in lower:
            score += 3
        if dept["name"].lower() in lower:
            score += 5
        for kw in dept["keywords"]:
            if kw in lower:
                score += 2
        if score > best_dept_score:
            best_dept_score = score
            best_dept = dept

    if not best_dept:
        if re.search(r"\b(hostel|mess|food|room|washroom|geyser)\b", lower):
            best_dept = next(d for d in DEPARTMENTS if d["code"] == "HSTEL")
        elif re.search(r"\b(library|book|fine)\b", lower):
            best_dept = next(d for d in DEPARTMENTS if d["code"] == "LIB")
        elif re.search(r"\b(exam|marks|hall ticket|grade)\b", lower):
            best_dept = next(d for d in DEPARTMENTS if d["code"] == "EXAM")
        elif re.search(r"\b(fee|payment|scholarship)\b", lower):
            best_dept = next(d for d in DEPARTMENTS if d["code"] == "FIN")
        elif re.search(r"\b(wifi|internet|smart board|projector)\b", lower):
            best_dept = next(d for d in DEPARTMENTS if d["code"] == "IT")
        elif re.search(r"\b(computer|programming|coding|workstation|lab)\b", lower):
            best_dept = next(d for d in DEPARTMENTS if d["code"] == "CSE")
        else:
            best_dept = next(d for d in DEPARTMENTS if d["code"] == "DEAN")

    code = best_dept["code"]
    category = "Academic"
    if code == "HSTEL":
        category = "Hostel"
    elif code == "LIB":
        category = "Library"
    elif code == "EXAM":
        category = "Examination"
    elif code == "FIN":
        category = "Finance"
    elif code in ("IT", "CIVIL", "MECH", "EEE", "ECE") and re.search(r"\b(broken|repair|bench|ac|light|socket|spark|projector|monitor|water|door)\b", lower):
        category = "Infrastructure"
    elif code in ("DEAN", "SPORTS", "PLCMT"):
        category = "Administration"

    priority = "Critical" if safety["isHazard"] else ("High" if re.search(r"\b(urgent|immediate|emergency|today|asap|severe|fail)\b", lower) else "Medium")

    return {
        "target_module": "department",
        "department_id": best_dept["id"],
        "department_code": best_dept["code"],
        "department_name": best_dept["name"],
        "department_icon": best_dept["icon"],
        "bus_id": None,
        "bus_number": None,
        "route_id": None,
        "route_number": None,
        "route_name": None,
        "suggested_category": category,
        "bus_complaint_type": None,
        "suggested_priority": priority,
        "is_safety_hazard": safety["isHazard"],
        "safety_reason": safety["reason"],
        "sentiment_score": -0.85 if safety["isHazard"] else -0.30,
        "confidence": 0.92 if best_dept_score > 0 else 0.80,
        "routing_reason": f"Intelligently routed to Department of {best_dept['name']} ({best_dept['code']}) under {category} division.",
        "is_heuristic": True,
        "ai_provider": "local",
    }


async def intelligent_route(text: str | None) -> dict[str, Any]:
    """Classify and route a grievance using real LLM with deterministic fallback."""
    clean = (text or "").strip()
    safety = detect_safety_hazard(clean)

    prompt = f"""
Analyze this student grievance for KLE Technological University, Belagavi:
\"\"\"{clean}\"\"\"

Campus Context:
- Transportation: Campus buses (#01, #02, #03, #04) and routes:
  * R-01: CBT to Campus (stops: CBT, Bogarves, Goaves, 3rd Gate)
  * R-02: RPD Cross / Tilakwadi to Campus (stops: RPD, Congress Rd, 2nd Gate, Angol)
  * R-03: Railway Station to Campus (stops: Station, Chennamma Circle, Club Rd, Camp)
  * R-04: Vadgaon / Shahapur to Campus (stops: Shahapur Gate, Khasbag, Basavan Galli)
- Departments: CSE, ISE, ECE, EEE, MECH, CIVIL, CHEM, BT, MATH, PHY, MBA, MCA, LIB (Library), HSTEL (Hostel), EXAM (Exam Cell), FIN (Finance), IT (Campus WiFi/Smart class), SPORTS, PLCMT (Placement), DEAN (Dean of Students).

Return ONLY a valid JSON object (no markdown) with keys:
{{
  "target_module": "transportation" | "department",
  "department_code": "CSE" | "HSTEL" | "LIB" | null,
  "department_name": string | null,
  "bus_number": "KA-22-F-1025 (Bus #02)" | null,
  "route_number": "R-01" | "R-02" | "R-03" | "R-04" | null,
  "category": "Academic" | "Infrastructure" | "Hostel" | "Library" | "Examination" | "Finance" | "Administration" | "Others",
  "bus_complaint_type": "delay" | "driver_behaviour" | "cleanliness" | "maintenance" | "route_issue" | "overcrowding" | "safety",
  "priority": "Low" | "Medium" | "High" | "Critical",
  "routing_reason": string,
  "confidence": number
}}
"""
    llm_res, provider = await call_llm(prompt, expect_json=True)
    if llm_res:
        try:
            parsed = json.loads(_clean_json_block(llm_res))
            dept = None
            if parsed.get("department_code"):
                code_up = str(parsed["department_code"]).upper()
                dept = next((d for d in DEPARTMENTS if d["code"].upper() == code_up), None)
            bus = None
            if parsed.get("bus_number"):
                bn = str(parsed["bus_number"])
                bus = next((b for b in BUSES if bn in b["number"] or b["short"] in bn), None)
            route = None
            if parsed.get("route_number"):
                rn = str(parsed["route_number"]).upper()
                route = next((r for r in ROUTES if r["number"].upper() == rn), None)

            resolved_priority = "Critical" if safety["isHazard"] else (parsed.get("priority") or "Medium")
            return {
                "target_module": parsed.get("target_module") or ("department" if parsed.get("department_code") else "transportation"),
                "department_id": dept["id"] if dept else None,
                "department_code": dept["code"] if dept else parsed.get("department_code"),
                "department_name": dept["name"] if dept else parsed.get("department_name"),
                "department_icon": dept["icon"] if dept else "🏛️",
                "bus_id": bus["id"] if bus else None,
                "bus_number": bus["number"] if bus else parsed.get("bus_number"),
                "route_id": route["id"] if route else None,
                "route_number": route["number"] if route else parsed.get("route_number"),
                "route_name": route["name"] if route else None,
                "suggested_category": parsed.get("category") or "Academic",
                "bus_complaint_type": parsed.get("bus_complaint_type") or "delay",
                "suggested_priority": resolved_priority,
                "is_safety_hazard": safety["isHazard"],
                "safety_reason": safety["reason"],
                "sentiment_score": -0.85 if safety["isHazard"] else -0.35,
                "confidence": parsed.get("confidence") or 0.95,
                "routing_reason": parsed.get("routing_reason") or "AI-assisted routing based on grievance context.",
                "is_heuristic": False,
                "ai_provider": provider,
            }
        except Exception as exc:
            print(f"[AI] LLM routing JSON parse fallback: {exc}")

    return heuristic_route(clean)


# ── 6. COMPLAINT REFINEMENT ───────────────────────────────────
async def refine_complaint(raw_text: str) -> dict[str, Any]:
    """Refine raw grievance text into structured sections."""
    safety = detect_safety_hazard(raw_text)

    prompt = f"""
Transform the student's raw text into a professional, factual report for KLE Technological University.
Raw Text: \"\"\"{raw_text}\"\"\"

RULES:
1. PRESERVE ORIGINAL MEANING.
2. ABSOLUTELY DO NOT INVENT facts (names, dates, bus numbers, locations).
3. For any missing detail, output exactly "[Not provided by student]".
4. Respond ONLY with valid JSON (no markdown) with keys:
   "suggested_title" (string, max 10 words)
   "what_happened" (string)
   "when_and_where" (string)
   "impact" (string)
   "requested_action" (string)
   "formatted_description" (string combining all 4 sections clearly)
"""
    llm_res, provider = await call_llm(prompt, expect_json=True)
    if llm_res:
        try:
            parsed = json.loads(_clean_json_block(llm_res))
            return {
                **parsed,
                "is_safety_hazard": safety["isHazard"],
                "safety_reason": safety["reason"],
                "is_heuristic": False,
                "ai_provider": provider,
            }
        except Exception as exc:
            print(f"[AI] LLM refine parse fallback: {exc}")

    fallback = heuristic_refine(raw_text)
    return {
        **fallback,
        "is_safety_hazard": safety["isHazard"],
        "safety_reason": safety["reason"],
        "ai_provider": "local",
    }


# ── 7. CONVERSATIONAL AI CHATBOT ENGINE ("KLE Saarthi") ────────
def _build_campus_context_text(db_context: dict[str, Any] | None) -> str:
    dept_lines = ", ".join(f"{d['code']} ({d['name']}, Head: {d['hod']} - {d['email']})" for d in DEPARTMENTS)
    bus_lines = "; ".join(f"{b['number']} Driver: {b['driver']} ({b['phone']})" for b in BUSES)
    route_lines = "; ".join(
        f"{r['number']}: {r['name']} | Morning: {r['morning']} | Evening: {r['evening']} | Stops: {', '.join(r['stops'])}"
        for r in ROUTES
    )

    ticket_summary = "No prior complaints on record."
    if db_context:
        dept_tickets = db_context.get("user_complaints") or []
        bus_tickets = db_context.get("user_bus_complaints") or []
        parts: list[str] = []
        if dept_tickets:
            parts.append(
                "Department complaints: "
                + "; ".join(
                    f"#{t['complaint_id']} '{t['title']}' [{t['department_code'] or t['category']}] Status={t['status']} Priority={t['priority']}"
                    for t in dept_tickets[:5]
                )
            )
        if bus_tickets:
            parts.append(
                "Bus complaints: "
                + "; ".join(
                    f"#B-{t['bus_complaint_id']} '{t['title']}' [{t['complaint_type']}] Status={t['status']} Priority={t['priority']}"
                    for t in bus_tickets[:5]
                )
            )
        if parts:
            ticket_summary = " | ".join(parts)

    return (
        f"Departments: {dept_lines}\n"
        f"Campus Buses: {bus_lines}\n"
        f"Bus Routes: {route_lines}\n"
        f"Current User's Filed Tickets: {ticket_summary}"
    )


def _local_recommendations(clean_msg: str, routing: dict[str, Any], safety: dict[str, Any]) -> list[str]:
    lower = clean_msg.lower()
    if safety["isHazard"]:
        return [
            "Submit this immediately as a Critical Safety Alert so Admins and Coordinators get an instant live alert.",
            "If anyone is in immediate physical danger, contact Campus Security / Dean of Students directly.",
            "Attach a photo or voice note if safe to do so for faster verification.",
        ]
    if routing.get("target_module") == "transportation":
        bus_info = next((b for b in BUSES if b["id"] == routing.get("bus_id")), None)
        recs = [
            "Note the exact date, time, bus number, and stop when filing so the Bus Coordinator can verify GPS logs.",
            "Attach a photo if the issue involves overcrowding, maintenance, or cleanliness.",
        ]
        if bus_info:
            recs.append(f"For immediate transit coordination, {bus_info['short']} driver is {bus_info['driver']} ({bus_info['phone']}).")
        else:
            recs.append("Include your Route ID (R-01 to R-04) so the Bus Coordinator can check schedule compliance.")
        return recs

    dept_code = routing.get("department_code")
    dept_info = next((d for d in DEPARTMENTS if d["code"] == dept_code), None)
    if "wifi" in lower or "internet" in lower or "portal" in lower:
        return [
            "Include your campus building/floor/block and screenshot of the Wi-Fi or portal error.",
            "Try forgetting and re-authenticating on the university Wi-Fi network to confirm if it's account-specific or router-wide.",
            f"Escalate to {dept_info['hod']} ({dept_info['email']}) if classes or lab exams are blocked.",
        ]
    if dept_info:
        return [
            f"Include exact room/lab/block numbers so {dept_info['name']} ({dept_info['code']}) staff can inspect immediately.",
            f"You can also reach {dept_info['hod']} at {dept_info['email']} for urgent academic follow-ups.",
            "Check for duplicate open tickets first so your report isn't delayed.",
        ]
    return [
        "Provide exact location, time, and impact so coordinators can resolve it within the 48-hour SLA.",
        "Attach supporting evidence (photo/PDF/voice note) before submitting.",
    ]


def _get_suggested_chips(intent: str, routing: dict[str, Any]) -> list[str]:
    if intent == "greeting":
        return [
            "🚌 Report Bus Delay on Route R-01 (CBT)",
            "💻 Report Lab Workstation Issue in CSE",
            "🏠 Report Hostel Mess / Hot Water Issue",
            "❓ How does intelligent routing work?",
        ]
    if intent == "route_query":
        return [
            "Bus #02 was 30 mins late from CBT",
            "Overcrowding on Route R-02 RPD Cross",
            "Check my filed complaints",
        ]
    if intent in ("question", "recommendation", "status_check"):
        return [
            "Check my filed complaints",
            "Show bus routes & driver contacts",
            "Help me draft a grievance",
        ]
    if routing.get("target_module") == "transportation":
        return [
            "What should I attach for a bus complaint?",
            "Show bus routes & timings",
            "Check my filed complaints",
        ]
    return [
        "What details help resolve this faster?",
        "Show department HoD contact",
        "Check my filed complaints",
    ]


async def chat_with_grievance_ai(
    message: str,
    conversation_history: list[dict[str, Any]] | None = None,
    student_profile: dict[str, Any] | None = None,
    db_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Conversational AI assistant ('KLE Saarthi') using real LLM API + live campus context."""
    history = conversation_history or []
    clean_msg = (message or "").strip()
    lower_msg = clean_msg.lower()

    full_dialogue = "\n".join(
        [
            *[f"{'Student' if m.get('sender') == 'user' else 'Assistant'}: {m.get('text', '')}" for m in history],
            f"Student: {clean_msg}",
        ]
    )

    last_2 = " ".join(str(m.get("text", "")) for m in history[-2:])
    last_3 = " ".join(str(m.get("text", "")) for m in history[-3:])
    safety = detect_safety_hazard(f"{clean_msg} {last_2}")
    routing = heuristic_route(f"{clean_msg} {last_3}")
    campus_context = _build_campus_context_text(db_context)
    student_name = (student_profile or {}).get("name", "Student")

    # ── Engine A: Real LLM API (1 single fast call per turn) ──
    system_prompt = (
        'You are "KLE Saarthi", an intelligent, warm, helpful AI Assistant for KLE Technological University, Belagavi. '
        "Solve whatever the user asks clearly and practically — whether it is a campus/technical/academic question, a request for recommendations, "
        "checking their filed tickets, or lodging a grievance. Always respond ONLY with a valid JSON object (no markdown fences)."
    )
    llm_prompt = f"""
Student Name: {student_name}

Live University Context:
{campus_context}

Conversation History:
{full_dialogue}

Latest Student Message: \"\"\"{clean_msg}\"\"\"

Pre-detected Routing Signal (for grievances):
- Target Module: {routing['target_module']}
- Department Code: {routing.get('department_code')} ({routing.get('department_name')})
- Bus/Route: {routing.get('bus_number')} / {routing.get('route_number')}
- Safety Hazard: {'YES - ' + str(safety['reason']) if safety['isHazard'] else 'No'}

Return ONLY a valid JSON object with these exact keys:
{{
  "intent": "greeting" | "question" | "recommendation" | "status_check" | "report_grievance",
  "reply": "Clear, genuinely helpful conversational answer solving what the user asked (2-6 sentences). Give direct solutions or real ticket info when asked.",
  "recommendations": ["Practical recommendation 1", "Practical recommendation 2", "Practical recommendation 3"],
  "should_draft_complaint": true or false (true ONLY when the student is reporting a problem/complaint to lodge; false for questions, advice, greetings, or status checks),
  "suggested_title": "Concise max 10-word title if should_draft_complaint is true, else null",
  "suggested_actions": ["Short follow-up prompt 1", "Short follow-up prompt 2", "Short follow-up prompt 3"]
}}
"""

    llm_raw, provider = await call_llm(llm_prompt, system_prompt=system_prompt, expect_json=True)
    if llm_raw:
        try:
            parsed = json.loads(_clean_json_block(llm_raw))
            intent = parsed.get("intent") or "question"
            should_draft = bool(parsed.get("should_draft_complaint", intent == "report_grievance"))
            recommendations = [str(r) for r in (parsed.get("recommendations") or []) if str(r).strip()][:4]
            suggested_actions = [str(a) for a in (parsed.get("suggested_actions") or []) if str(a).strip()][:4]

            extracted_complaint = None
            if should_draft:
                refined = heuristic_refine(clean_msg)
                if parsed.get("suggested_title"):
                    refined["suggested_title"] = str(parsed["suggested_title"]).strip()
                extracted_complaint = {
                    **refined,
                    **routing,
                    "is_heuristic": False,
                    "ai_provider": provider,
                    "title": refined["suggested_title"],
                    "description": refined["formatted_description"],
                }

            return {
                "reply": (parsed.get("reply") or "").strip() or "How can I assist you today?",
                "intent": intent,
                "recommendations": recommendations,
                "routing": {**routing, "is_heuristic": False, "ai_provider": provider},
                "safety": safety,
                "extracted_complaint": extracted_complaint,
                "suggested_actions": suggested_actions or _get_suggested_chips(intent, routing),
                "ai_provider": provider,
            }
        except Exception as exc:
            print(f"[AI] LLM chat JSON parse fallback: {exc}")

    # ── Engine B: Offline Intent-Aware Smart Fallback ──
    has_grievance_words = bool(
        re.search(
            r"\b(late|delay|delayed|breakdown|broken|problem|issue|dirty|rash|crowd|overcrowd|skipped|"
            r"harass|fight|not working|spark|mess|fail|fault|leak|struck|damage|flicker|shouting|hit|contaminated|sick|missing)\b",
            lower_msg,
        )
    )
    is_greeting = (
        bool(re.match(r"^(hi|hello|hey|namaste|good\s*morning|good\s*afternoon|good\s*evening)\b", clean_msg, re.IGNORECASE))
        and len(clean_msg.split()) <= 4
        and not has_grievance_words
    )
    is_routing_info = bool(re.search(r"\b(intelligent routing|how does.*rout|auto.?rout|how.*ai.*work)\b", lower_msg))
    is_status_query = bool(re.search(r"\b(status|track|my complaint|my grievance|filed complaint|complaint #?\d+|where is my ticket)\b", lower_msg)) and not has_grievance_words
    is_route_query = bool(re.search(r"\b(bus timing|bus schedule|route timing|driver contact|morning schedule|evening schedule|bus routes|timings)\b", lower_msg)) and not has_grievance_words
    is_help_query = bool(re.search(r"\b(how to|what can you do|options|features|commands|guide|recommend|suggest|what should i do|advice|contact|who do i)\b", lower_msg))
    is_question = clean_msg.endswith("?") or bool(re.match(r"^(how|what|which|who|where|when|why|can|should|could|is|are|do|does)\b", lower_msg))

    reply = ""
    intent = "question"
    recommendations: list[str] = []
    extracted_complaint = None

    if is_greeting:
        intent = "greeting"
        reply = (
            f"Hello {student_name.split()[0]}! I am KLE Saarthi, your KLE Tech Campus & Grievance Assistant. "
            "Ask me any question (bus schedules, department contacts, ticket status, troubleshooting steps), ask for recommendations, or describe an issue and I will structure and route it for you."
        )
        recommendations = [
            "Ask 'Check my filed complaints' to see live status of your tickets.",
            "Ask 'Show bus routes & timings' for CBT, RPD, Station, or Shahapur schedules.",
            "Describe any campus or bus problem to auto-draft a formal grievance.",
        ]
    elif is_routing_info:
        intent = "question"
        reply = (
            "Intelligent Routing analyzes your complaint text to detect whether it belongs to a University Department (20 divisions like CSE, Hostel, Library, Exam Cell, IT) "
            "or Campus Transportation (Routes R-01 to R-04 and Buses #01–#04). It also flags safety hazards as Critical priority and checks recent open tickets to warn you about duplicates before submitting."
        )
        recommendations = [
            "Include specific keywords like room/lab number, hostel block, or bus route (e.g., CBT / R-01) for 90%+ routing accuracy.",
            "Mention safety risks explicitly (e.g., electrical sparks, rash driving) so they receive emergency priority.",
        ]
    elif is_status_query:
        intent = "status_check"
        dept_tickets = (db_context or {}).get("user_complaints") or []
        bus_tickets = (db_context or {}).get("user_bus_complaints") or []
        if not dept_tickets and not bus_tickets:
            reply = (
                "You currently have no filed department or bus complaints on record. "
                "If you are facing an issue on campus or on a college bus, describe it here and I can help draft and route it."
            )
            recommendations = [
                "Use the 'New Grievance' page or describe your issue directly in this chat.",
                "Verify you are signed into your @kletech.ac.in account if you filed elsewhere.",
            ]
        else:
            lines: list[str] = ["Here are your latest filed grievances:"]
            for t in dept_tickets[:3]:
                lines.append(f"• Dept #{t['complaint_id']}: {t['title']} — Status: {t['status']} ({t['priority']})")
            for t in bus_tickets[:3]:
                lines.append(f"• Bus #B-{t['bus_complaint_id']}: {t['title']} — Status: {t['status']} ({t['priority']})")
            reply = "\n".join(lines)
            recommendations = [
                "Open 'My Grievances' from the sidebar to read coordinator replies or view status timelines.",
                "Standard SLA is 48 hours (4 hours for safety hazards); follow up with the department HoD if overdue.",
            ]
    elif is_route_query:
        intent = "route_query"
        route_summary = "\n".join(
            f"• {r['number']} ({r['name']}): Morning {r['morning']} | Evening {r['evening']}"
            for r in ROUTES
        )
        driver_summary = ", ".join(f"{b['short']}: {b['driver']} ({b['phone']})" for b in BUSES)
        reply = f"Here are the official KLE Tech campus bus schedules:\n{route_summary}\n\nDrivers: {driver_summary}."
        recommendations = [
            "Arrive at your stop 5–10 minutes before the scheduled pickup window.",
            "If a bus is delayed by >15 mins or skips a stop, tell me the route/bus number so I can draft a Bus Coordinator report.",
        ]
    elif (is_help_query or is_question) and not has_grievance_words:
        intent = "recommendation" if "recommend" in lower_msg or "suggest" in lower_msg or "should i" in lower_msg else "question"
        if routing["target_module"] == "transportation":
            reply = (
                "For campus bus & transit queries, the Bus Coordinator handles delays, overcrowding, cleanliness, maintenance, and driver conduct across Routes R-01 to R-04. "
                "If you'd like to report a specific bus incident, share the bus/route number and what happened."
            )
        else:
            dept_info = next((d for d in DEPARTMENTS if d["code"] == routing.get("department_code")), None)
            dept_label = f"{dept_info['name']} ({dept_info['code']}, Head: {dept_info['hod']} — {dept_info['email']})" if dept_info else "the relevant department"
            reply = f"Based on your query, the best department to resolve this is {dept_label}. Follow the recommendations below, or describe the exact incident if you'd like me to draft a formal grievance."
        recommendations = _local_recommendations(clean_msg, routing, safety)
    else:
        intent = "report_grievance"
        refined = heuristic_refine(clean_msg)
        extracted_complaint = {
            **refined,
            **routing,
            "title": refined["suggested_title"],
            "description": refined["formatted_description"],
        }
        recommendations = _local_recommendations(clean_msg, routing, safety)

        if safety["isHazard"]:
            target_desc = (
                "Bus Coordinator and Administration"
                if routing["target_module"] == "transportation"
                else f"{routing['department_name']} & Dean of Students"
            )
            reply = (
                f"🚨 I have flagged this as an urgent Safety Hazard ({safety['reason']}). "
                f"I classified it as CRITICAL priority and routed it to {target_desc}. "
                'Review the draft below and click "Transfer to Grievance Form & Review" to submit immediately.'
            )
        elif routing["target_module"] == "transportation":
            route_str = f"Route {routing['route_number']}" if routing.get("route_number") else "Campus Transportation"
            bus_str = f" ({routing['bus_number']})" if routing.get("bus_number") else ""
            reply = (
                f"I have structured your transit issue and routed it to the Campus Bus Coordinator for {route_str}{bus_str} "
                f"(Priority: {routing['suggested_priority']}). Review the draft below or follow the recommendations to get this resolved quickly."
            )
        else:
            reply = (
                f"I have structured your grievance and routed it to the Department of {routing['department_name']} ({routing['department_code']}) "
                f"under {routing['suggested_category']}. Review the draft below and click \"Transfer to Grievance Form & Review\" to lodge it."
            )

    return {
        "reply": reply,
        "intent": intent,
        "recommendations": recommendations,
        "routing": routing,
        "safety": safety,
        "extracted_complaint": extracted_complaint,
        "suggested_actions": _get_suggested_chips(intent, routing),
        "ai_provider": "local",
    }


# ── 8. COORDINATOR DRAFT REPLY GENERATOR ─────────────────────
async def generate_draft_reply(
    complaint_title: str,
    complaint_description: str | None = "",
    category_or_type: str = "General",
    status: str = "Under Review",
) -> str:
    """Draft an official coordinator reply."""
    prompt = f"""
You are an administrative coordinator at KLE Technological University, Belagavi.
Draft a courteous, official, and reassuring response to this grievance.
Complaint Title: "{complaint_title}"
Category/Type: "{category_or_type}"
Current Status: "{status}"
Description snippet: "{(complaint_description or '')[:300]}"

Tone: Professional, empathetic, university-grade.
Length: 3 to 4 sentences.
Do not include placeholders. State that the department/transport division has registered the matter for active resolution.
"""
    res, _ = await call_llm(prompt)
    if res:
        return res.strip()

    return (
        f'Dear Student, thank you for bringing this matter regarding "{complaint_title}" to our notice. '
        "The concerned authorities have reviewed your grievance and appropriate corrective action has been initiated "
        "under our standard service protocol. We are monitoring the resolution closely to prevent recurrence."
    )


# ── 9. EXECUTIVE SUMMARIZER ──────────────────────────────────
async def summarize_grievance(text: str | None) -> str:
    """Return a concise executive summary."""
    if not text:
        return "No content provided."
    res, _ = await call_llm(f"Summarize this university grievance concisely in 2 clear sentences:\n\n{text}")
    if res:
        return res.strip()
    sentences = [s.strip() for s in re.split(r"[.?!]\s+", text) if len(s.strip()) > 10]
    if len(sentences) <= 2:
        return text
    return f"{sentences[0]}. {sentences[1]}."
