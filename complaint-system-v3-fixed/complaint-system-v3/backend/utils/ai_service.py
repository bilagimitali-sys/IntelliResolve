"""
KLE Technological University — Grievance Intelligence Service
Dual-Engine AI Pipeline:
  Engine A: Google Gemini API (if GEMINI_API_KEY is configured in .env)
  Engine B: High-Accuracy Heuristic NLP & Knowledge Graph (zero-dependency, always on)
"""

from __future__ import annotations

import json
import re
from typing import Any

import httpx

import config

# ── 1. KLE TECH KNOWLEDGE BASE ────────────────────────────────
DEPARTMENTS: list[dict[str, Any]] = [
    {"id": 1, "code": "CSE", "name": "Computer Science & Engineering", "icon": "💻", "keywords": ["cse", "computer science", "programming", "coding", "lab workstation", "software", "cloud", "linux lab", "server", "compiler", "ai lab", "system crash"]},
    {"id": 2, "code": "ISE", "name": "Information Science & Engineering", "icon": "🖥️", "keywords": ["ise", "information science", "software engineering", "web tech lab", "database lab"]},
    {"id": 3, "code": "ECE", "name": "Electronics & Communication Engg", "icon": "📡", "keywords": ["ece", "electronics", "communication", "vlsi", "signal", "embedded", "oscilloscope", "circuit board", "sensor"]},
    {"id": 4, "code": "EEE", "name": "Electrical & Electronics Engg", "icon": "⚡", "keywords": ["eee", "electrical", "transformer", "high voltage", "motor lab", "power grid", "switchgear", "short circuit"]},
    {"id": 5, "code": "MECH", "name": "Mechanical Engineering", "icon": "⚙️", "keywords": ["mech", "mechanical", "workshop", "lathe", "welding", "cad", "cam", "cnc", "machine tool", "fluid mechanics"]},
    {"id": 6, "code": "CIVIL", "name": "Civil Engineering", "icon": "🏗️", "keywords": ["civil", "surveying", "concrete", "soil mechanics", "hydraulics", "structural", "construction", "building defect"]},
    {"id": 7, "code": "CHEM", "name": "Chemical Engineering", "icon": "🧪", "keywords": ["chem", "chemical", "reaction", "distillation", "mass transfer", "chemistry lab", "acid", "fume hood"]},
    {"id": 8, "code": "BT", "name": "Biotechnology", "icon": "🧬", "keywords": ["bt", "biotech", "biotechnology", "microbiology", "bioinformatics", "genetics", "incubator", "specimen"]},
    {"id": 9, "code": "MATH", "name": "Mathematics", "icon": "📐", "keywords": ["math", "mathematics", "calculus", "algebra", "statistics", "differential equation"]},
    {"id": 10, "code": "PHY", "name": "Physics", "icon": "🔬", "keywords": ["phy", "physics", "optics", "laser", "dark room", "spectrometer", "physics lab"]},
    {"id": 11, "code": "MBA", "name": "MBA", "icon": "📊", "keywords": ["mba", "management", "business", "marketing", "finance lecture", "case study room"]},
    {"id": 12, "code": "MCA", "name": "MCA", "icon": "🎓", "keywords": ["mca", "master of computer applications", "mca lab"]},
    {"id": 13, "code": "LIB", "name": "Library", "icon": "📚", "keywords": ["library", "books", "book", "reading room", "journal", "digital library", "fine", "librarian", "borrow", "return book", "id card scan"]},
    {"id": 14, "code": "HSTEL", "name": "Hostel / Accommodation", "icon": "🏠", "keywords": ["hostel", "mess", "food", "room", "warden", "hot water", "geyser", "washroom", "hostel water", "block a", "block b", "block c", "hostel wifi", "mess food", "caterer", "insects in food"]},
    {"id": 15, "code": "EXAM", "name": "Examination Cell", "icon": "📝", "keywords": ["exam", "examination", "hall ticket", "marksheet", "grade card", "revaluation", "re-exam", "internal marks", "seating", "backlog", "result delay", "transcript"]},
    {"id": 16, "code": "FIN", "name": "Finance & Accounts", "icon": "💰", "keywords": ["fee", "fees", "tuition", "challan", "receipt", "refund", "scholarship", "finance", "payment failure", "accounts counter", "bank draft"]},
    {"id": 17, "code": "IT", "name": "IT & Technical Support", "icon": "🔧", "keywords": ["wifi", "wi-fi", "campus wifi", "internet", "portal", "moodle", "login issue", "projector", "smart board", "sound system", "audio speaker", "lan cable", "firewall"]},
    {"id": 18, "code": "SPORTS", "name": "Sports & Physical Education", "icon": "🏃", "keywords": ["sports", "gym", "ground", "badminton court", "basketball", "cricket", "football", "fitness equipment", "coach", "sports kit"]},
    {"id": 19, "code": "PLCMT", "name": "Placement Cell", "icon": "🤝", "keywords": ["placement", "interview", "internship", "company drive", "aptitude", "tpo", "training & placement", "campus interview"]},
    {"id": 20, "code": "DEAN", "name": "Dean of Students", "icon": "🏛️", "keywords": ["dean", "student welfare", "discipline", "cultural", "fest", "club", "student council", "extracurricular"]},
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
        "stops": ["CBT", "Bogarves", "Goaves", "3rd Gate", "Third Gate", "Udyambag Campus"],
        "keywords": ["cbt", "central bus stand", "bogarves", "goaves", "3rd gate", "third gate", "r-01", "route 1", "route r-01"],
    },
    {
        "id": 2,
        "number": "R-02",
        "name": "RPD Cross / Tilakwadi to Campus",
        "stops": ["RPD Cross", "Congress Road", "2nd Gate", "Second Gate", "Angol", "Udyambag Campus"],
        "keywords": ["rpd", "rpd cross", "tilakwadi", "congress road", "2nd gate", "second gate", "angol", "r-02", "route 2", "route r-02"],
    },
    {
        "id": 3,
        "number": "R-03",
        "name": "Belagavi Railway Station to Campus",
        "stops": ["Railway Station", "Chennamma Circle", "Club Road", "Camp", "Udyambag Campus"],
        "keywords": ["railway station", "station", "chennamma circle", "club road", "camp", "r-03", "route 3", "route r-03"],
    },
    {
        "id": 4,
        "number": "R-04",
        "name": "Vadgaon / Shahapur to Campus",
        "stops": ["Shahapur Gate", "Khasbag", "Basavan Galli", "Old Belagavi", "Udyambag Campus"],
        "keywords": ["vadgaon", "shahapur", "shahapur gate", "khasbag", "basavan galli", "old belagavi", "r-04", "route 4", "route r-04"],
    },
]

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


# ── 3. GEMINI API PROXY HELPER ────────────────────────────────
async def call_gemini(prompt: str, model: str = "gemini-1.5-flash") -> str | None:
    """Call Google Gemini REST API if GEMINI_API_KEY is configured."""
    api_key = config.GEMINI_API_KEY
    if not api_key:
        return None

    models_to_try = list(dict.fromkeys([model, "gemini-1.5-flash", "gemini-2.0-flash"]))
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.15,
            "topP": 0.85,
            "maxOutputTokens": 1200,
        },
    }

    async with httpx.AsyncClient(timeout=6.0) as client:
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
            except Exception:
                continue
    return None


def _clean_json_block(raw: str) -> str:
    return re.sub(r"```json|```", "", raw, flags=re.IGNORECASE).strip()


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


async def intelligent_route(text: str | None) -> dict[str, Any]:
    """Classify and route a grievance to Department or Transportation module."""
    clean = (text or "").strip()
    safety = detect_safety_hazard(clean)

    if config.GEMINI_API_KEY:
        prompt = f"""
      You are an expert Grievance Triage Classifier for KLE Technological University, Belagavi.
      Analyze this student grievance: \"\"\"{clean}\"\"\"

      Campus Context:
      - Transportation: Campus buses (#01, #02, #03, #04) and routes:
        * R-01: CBT to Campus (stops: CBT, Bogarves, Goaves, 3rd Gate)
        * R-02: RPD Cross / Tilakwadi to Campus (stops: RPD, Congress Rd, 2nd Gate, Angol)
        * R-03: Railway Station to Campus (stops: Station, Chennamma Circle, Club Rd, Camp)
        * R-04: Vadgaon / Shahapur to Campus (stops: Shahapur Gate, Khasbag, Basavan Galli)
      - Departments: CSE, ISE, ECE, EEE, MECH, CIVIL, CHEM, BT, MATH, PHY, MBA, MCA, LIB (Library), HSTEL (Hostel), EXAM (Exam Cell), FIN (Finance), IT (Campus WiFi/Smart class), SPORTS, PLCMT (Placement), DEAN (Dean of Students).

      Return ONLY a valid JSON object with keys:
      {{
        "target_module": "transportation" | "department",
        "department_code": "CSE" | "HSTEL" | "LIB" | ... (or null if transportation),
        "department_name": string (or null),
        "bus_number": "KA-22-F-1025 (Bus #02)" | ... (or null),
        "route_number": "R-01" | "R-02" | ... (or null),
        "category": "Academic" | "Infrastructure" | "Hostel" | "Library" | "Examination" | "Finance" | "Administration" | "Others",
        "bus_complaint_type": "delay" | "driver_behaviour" | "cleanliness" | "maintenance" | "route_issue" | "overcrowding" | "safety",
        "priority": "Low" | "Medium" | "High" | "Critical",
        "routing_reason": string (brief 1-sentence justification),
        "confidence": number (between 0.70 and 0.99)
      }}
        """
        try:
            gemini_res = await call_gemini(prompt)
            if gemini_res:
                parsed = json.loads(_clean_json_block(gemini_res))
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
                }
        except Exception as exc:
            print(f"Gemini intelligent routing fallback: {exc}")

    # ── Heuristic Fallback Classifier & Knowledge Matcher ──
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
        }

    # 2. Department Matcher
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
    }


# ── 6. COMPLAINT REFINEMENT ───────────────────────────────────
async def refine_complaint(raw_text: str) -> dict[str, Any]:
    """Refine raw grievance text into structured sections."""
    safety = detect_safety_hazard(raw_text)

    if config.GEMINI_API_KEY:
        prompt = f"""
      You are an expert University Grievance Structuring Assistant for KLE Technological University.
      Transform the student's raw text into a professional, factual report.
      Raw Text: \"\"\"{raw_text}\"\"\"

      RULES:
      1. PRESERVE ORIGINAL MEANING.
      2. ABSOLUTELY DO NOT INVENT facts (names, dates, bus numbers, locations).
      3. For any missing detail, output exactly "[Not provided by student]".
      4. Respond ONLY with valid JSON with keys:
         "suggested_title" (string, max 10 words)
         "what_happened" (string)
         "when_and_where" (string)
         "impact" (string)
         "requested_action" (string)
         "formatted_description" (string combining all 4 sections)
        """
        try:
            gemini_res = await call_gemini(prompt)
            if gemini_res:
                parsed = json.loads(_clean_json_block(gemini_res))
                return {
                    **parsed,
                    "is_safety_hazard": safety["isHazard"],
                    "safety_reason": safety["reason"],
                    "is_heuristic": False,
                }
        except Exception as exc:
            print(f"Gemini refine fallback triggered: {exc}")

    fallback = heuristic_refine(raw_text)
    return {
        **fallback,
        "is_safety_hazard": safety["isHazard"],
        "safety_reason": safety["reason"],
    }


# ── 7. CONVERSATIONAL AI CHATBOT ENGINE ("KLE Saarthi") ────────
def _get_suggested_chips(routing: dict[str, Any], is_greeting: bool, is_route_query: bool) -> list[str]:
    if is_greeting:
        return [
            "🚌 Report Bus Delay on Route R-01 (CBT)",
            "💻 Report Lab Workstation Issue in CSE",
            "🏠 Report Hostel Mess / Hot Water Issue",
            "📚 Report Library Book Fine Discrepancy",
        ]
    if is_route_query:
        return [
            "Bus #02 was 30 mins late from CBT",
            "Overcrowding on Route R-02 RPD Cross",
            "Driver contact information",
        ]
    if routing.get("target_module") == "transportation":
        return [
            "Transfer to Bus Grievance Form",
            "Change to Department Grievance",
            "Check Duplicate Bus Complaints",
        ]
    return [
        "Transfer to Department Form",
        "Change to Bus Grievance",
        "Add More Details",
    ]


async def chat_with_grievance_ai(
    message: str,
    conversation_history: list[dict[str, Any]] | None = None,
    student_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Conversational intake & triage assistant ('KLE Saarthi')."""
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
    routing = await intelligent_route(f"{clean_msg} {last_3}")

    has_grievance_words = bool(
        re.search(
            r"\b(late|delay|delayed|breakdown|broken|problem|issue|dirty|rash|crowd|overcrowd|skipped|"
            r"harass|fight|not working|spark|mess|fail|fault|leak|struck|damage|flicker|shouting|hit)\b",
            lower_msg,
        )
    )
    is_greeting = (
        bool(re.match(r"^(hi|hello|hey|namaste|good\s*morning|good\s*afternoon|good\s*evening)\b", clean_msg, re.IGNORECASE))
        and len(clean_msg.split()) <= 4
        and not has_grievance_words
    )
    is_help_query = bool(re.search(r"\b(how to|what can you do|help|options|features|commands|guide)\b", lower_msg)) and not has_grievance_words
    is_status_query = bool(re.search(r"\b(status|track|my complaint|complaint #?\d+|where is my ticket)\b", lower_msg)) and not has_grievance_words
    is_route_query = bool(re.search(r"\b(bus timing|bus schedule|route timing|driver contact|morning schedule|evening schedule)\b", lower_msg)) and not has_grievance_words

    if config.GEMINI_API_KEY and not is_greeting:
        prompt = f"""
      You are "KLE Saarthi", the official AI Grievance Intake & Campus Assistant for KLE Technological University, Belagavi.
      You help students resolve campus issues politely, quickly, and accurately.

      Campus Facts:
      - 20 Departments (CSE, ISE, ECE, EEE, MECH, CIVIL, Library, Hostel, Exam Cell, Finance, IT Support, etc.)
      - Campus transit fleet: 4 Buses (#01 to #04) and 4 Routes (R-01 CBT, R-02 RPD, R-03 Railway Station, R-04 Shahapur).
      - Emergency safety issues are routed with Critical Priority.
      - Standard grievance resolution SLA is 48 hours; emergencies within 4 hours.

      Conversation So Far:
      {full_dialogue}

      Current Routing Detection:
      - Module: {routing['target_module']}
      - Department / Transit: {routing.get('department_name') or routing.get('route_name') or 'General'}
      - Priority: {routing['suggested_priority']}
      - Safety Hazard: {'YES (' + str(safety['reason']) + ')' if safety['isHazard'] else 'No'}

      Instructions:
      1. Be warm, empathetic, and concise (2-4 sentences).
      2. If the student has shared an issue, acknowledge it, confirm where it is being routed, and tell them they can transfer it to the complaint form with one click.
      3. If a critical detail is missing (e.g. which bus number, stop, or department/lab), politely ask for that detail.
      4. DO NOT make up non-existent facts or promises.
        """
        try:
            gemini_reply = await call_gemini(prompt)
            if gemini_reply:
                is_reporting = not is_help_query and not is_status_query and len(clean_msg) > 15
                structured_preview = None
                if is_reporting:
                    refined = await refine_complaint(clean_msg)
                    structured_preview = {
                        **refined,
                        **routing,
                        "title": refined.get("suggested_title"),
                        "description": refined.get("formatted_description"),
                    }
                return {
                    "reply": gemini_reply.strip(),
                    "routing": routing,
                    "safety": safety,
                    "extracted_complaint": structured_preview,
                    "suggested_actions": _get_suggested_chips(routing, is_greeting, is_route_query),
                }
        except Exception as exc:
            print(f"Gemini chat error, falling back to heuristic assistant: {exc}")

    reply = ""
    extracted_complaint = None

    if is_greeting:
        reply = (
            "Hello! I am your KLE Tech Grievance Assistant. I can help you structure and route complaints "
            "for campus departments (CSE, Hostel, Library, Exams, etc.) or campus transit buses (CBT, RPD, Station, Shahapur). "
            "How can I assist you today?"
        )
    elif is_status_query:
        reply = (
            'You can monitor the live progress of all your submitted grievances anytime in the "My Grievances" tab. '
            'If you have a specific ticket ID (e.g., #104), our coordinators update each stage from "Received" to "Resolved" in real time.'
        )
    elif is_route_query:
        reply = (
            "KLE Tech operates 4 campus transit routes: R-01 (CBT to Campus at 7:45 AM & 4:45 PM), "
            "R-02 (RPD Cross / Tilakwadi at 8:00 AM), R-03 (Railway Station at 7:50 AM), and R-04 (Shahapur Gate at 8:05 AM). "
            "If you are facing any delays or driver issues, describe what happened and I'll route it directly to the Bus Coordinator!"
        )
    elif is_help_query:
        reply = (
            "You can describe any campus grievance to me casually in English or Hinglish. I will automatically identify the right "
            "department or bus route, evaluate urgency or safety hazards, structure your report professionally, and fill your grievance form with one click!"
        )
    else:
        refined = heuristic_refine(clean_msg)
        extracted_complaint = {
            **refined,
            **routing,
            "title": refined["suggested_title"],
            "description": refined["formatted_description"],
        }

        if safety["isHazard"]:
            target_desc = (
                "Bus Coordinator and Administration"
                if routing["target_module"] == "transportation"
                else f"{routing['department_name']} & Dean of Students"
            )
            reply = (
                f"🚨 I have flagged this as an urgent Safety Hazard ({safety['reason']}). "
                f"I have automatically classified it as CRITICAL priority and routed it directly to the {target_desc}. "
                'Review the structured report below and click "Transfer to Form" to submit immediately.'
            )
        elif routing["target_module"] == "transportation":
            route_str = f"Route {routing['route_number']}" if routing.get("route_number") else "Campus Transportation"
            bus_str = f" ({routing['bus_number']})" if routing.get("bus_number") else ""
            reply = (
                f"I have analyzed your transit issue and routed it to the Campus Bus Coordinator for {route_str}{bus_str}. "
                f"The priority has been set to {routing['suggested_priority']}. "
                "You can review the structured summary below and transfer it directly to the grievance form."
            )
        else:
            reply = (
                f"Thank you for reporting this. I have structured your grievance and intelligently routed it to the "
                f"Department of {routing['department_name']} ({routing['department_code']}) under {routing['suggested_category']}. "
                'Review the drafted details below and click "Transfer to Form" to lodge it.'
            )

    return {
        "reply": reply,
        "routing": routing,
        "safety": safety,
        "extracted_complaint": extracted_complaint,
        "suggested_actions": _get_suggested_chips(routing, is_greeting, is_route_query),
    }


# ── 8. COORDINATOR DRAFT REPLY GENERATOR ─────────────────────
async def generate_draft_reply(
    complaint_title: str,
    complaint_description: str | None = "",
    category_or_type: str = "General",
    status: str = "Under Review",
) -> str:
    """Draft an official coordinator reply."""
    if config.GEMINI_API_KEY:
        prompt = f"""
      You are an administrative coordinator at KLE Technological University, Belagavi.
      Draft a courteous, official, and reassuring response to this grievance.
      Complaint Title: "{complaint_title}"
      Category/Type: "{category_or_type}"
      Current Status: "{status}"
      Description snippet: "{(complaint_description or '')[:300]}"

      Tone: Professional, empathetic, university-grade.
      Length: 3 to 4 sentences.
      Do not include place-holders. State that the department/transport division has registered the matter for active resolution.
        """
        try:
            res = await call_gemini(prompt)
            if res:
                return res.strip()
        except Exception:
            pass

    return (
        f'Dear Student, thank you for bringing this matter regarding "{complaint_title}" to our notice. '
        "The concerned authorities have reviewed your grievance and appropriate corrective action has been initiated "
        "under our standard service protocol. We are monitoring the resolution closely to prevent recurrence."
    )


# ── 9. EXECUTIVE SUMMARIZER ──────────────────────────────────
async def summarize_grievance(text: str | None) -> str:
    """Return a concise 2-sentence executive summary."""
    if not text:
        return "No content provided."
    sentences = [s.strip() for s in re.split(r"[.?!]\s+", text) if len(s.strip()) > 10]
    if len(sentences) <= 2:
        return text
    return f"{sentences[0]}. {sentences[1]}."
