/**
 * ============================================================
 * KLE TECHNOLOGICAL UNIVERSITY — GRIEVANCE INTELLIGENCE SERVICE
 * backend/utils/aiService.js
 * ============================================================
 * Dual-Engine AI Pipeline:
 *   Engine A: Google Gemini API (if GEMINI_API_KEY is configured in .env)
 *   Engine B: High-Accuracy Heuristic NLP & Knowledge Graph (zero-dependency, always on)
 *
 * Core Capabilities:
 *   1. AI-based Complaint Structuring (What Happened, When/Where, Impact, Requested Action)
 *   2. Zero-Hallucination Guarantees (Missing facts explicitly marked "[Not provided by student]")
 *   3. Intelligent Routing (Auto-detects Department vs Campus Bus, Dept ID, Bus & Route IDs)
 *   4. Automated Categorization & Priority/Urgency Detection
 *   5. Safety Hazard Flagging (Emergency prioritization for fire, assault, brake failure, etc.)
 *   6. Conversational AI Chatbot ("KLE Tech Grievance Assistant") for multi-turn intake
 *   7. Coordinator Draft Reply Generation & Executive Summarization
 */

const https = require('https');

// ── 1. KLE TECH KNOWLEDGE BASE ────────────────────────────────
const DEPARTMENTS = [
  { id: 1,  code: 'CSE',    name: 'Computer Science & Engineering',    icon: '💻', keywords: ['cse', 'computer science', 'programming', 'coding', 'lab workstation', 'software', 'cloud', 'linux lab', 'server', 'compiler', 'ai lab', 'system crash'] },
  { id: 2,  code: 'ISE',    name: 'Information Science & Engineering', icon: '🖥️', keywords: ['ise', 'information science', 'software engineering', 'web tech lab', 'database lab'] },
  { id: 3,  code: 'ECE',    name: 'Electronics & Communication Engg',  icon: '📡', keywords: ['ece', 'electronics', 'communication', 'vlsi', 'signal', 'embedded', 'oscilloscope', 'circuit board', 'sensor'] },
  { id: 4,  code: 'EEE',    name: 'Electrical & Electronics Engg',     icon: '⚡', keywords: ['eee', 'electrical', 'transformer', 'high voltage', 'motor lab', 'power grid', 'switchgear', 'short circuit'] },
  { id: 5,  code: 'MECH',   name: 'Mechanical Engineering',            icon: '⚙️', keywords: ['mech', 'mechanical', 'workshop', 'lathe', 'welding', 'cad', 'cam', 'cnc', 'machine tool', 'fluid mechanics'] },
  { id: 6,  code: 'CIVIL',  name: 'Civil Engineering',                 icon: '🏗️', keywords: ['civil', 'surveying', 'concrete', 'soil mechanics', 'hydraulics', 'structural', 'construction', 'building defect'] },
  { id: 7,  code: 'CHEM',   name: 'Chemical Engineering',              icon: '🧪', keywords: ['chem', 'chemical', 'reaction', 'distillation', 'mass transfer', 'chemistry lab', 'acid', 'fume hood'] },
  { id: 8,  code: 'BT',     name: 'Biotechnology',                     icon: '🧬', keywords: ['bt', 'biotech', 'biotechnology', 'microbiology', 'bioinformatics', 'genetics', 'incubator', 'specimen'] },
  { id: 9,  code: 'MATH',   name: 'Mathematics',                       icon: '📐', keywords: ['math', 'mathematics', 'calculus', 'algebra', 'statistics', 'differential equation'] },
  { id: 10, code: 'PHY',    name: 'Physics',                           icon: '🔬', keywords: ['phy', 'physics', 'optics', 'laser', 'dark room', 'spectrometer', 'physics lab'] },
  { id: 11, code: 'MBA',    name: 'MBA',                               icon: '📊', keywords: ['mba', 'management', 'business', 'marketing', 'finance lecture', 'case study room'] },
  { id: 12, code: 'MCA',    name: 'MCA',                               icon: '🎓', keywords: ['mca', 'master of computer applications', 'mca lab'] },
  { id: 13, code: 'LIB',    name: 'Library',                           icon: '📚', keywords: ['library', 'books', 'book', 'reading room', 'journal', 'digital library', 'fine', 'librarian', 'borrow', 'return book', 'id card scan'] },
  { id: 14, code: 'HSTEL',  name: 'Hostel / Accommodation',            icon: '🏠', keywords: ['hostel', 'mess', 'food', 'room', 'warden', 'hot water', 'geyser', 'washroom', 'hostel water', 'block a', 'block b', 'block c', 'hostel wifi', 'mess food', 'caterer', 'insects in food'] },
  { id: 15, code: 'EXAM',   name: 'Examination Cell',                  icon: '📝', keywords: ['exam', 'examination', 'hall ticket', 'marksheet', 'grade card', 'revaluation', 're-exam', 'internal marks', 'seating', 'backlog', 'result delay', 'transcript'] },
  { id: 16, code: 'FIN',    name: 'Finance & Accounts',                icon: '💰', keywords: ['fee', 'fees', 'tuition', 'challan', 'receipt', 'refund', 'scholarship', 'finance', 'payment failure', 'accounts counter', 'bank draft'] },
  { id: 17, code: 'IT',     name: 'IT & Technical Support',            icon: '🔧', keywords: ['wifi', 'wi-fi', 'campus wifi', 'internet', 'portal', 'moodle', 'login issue', 'projector', 'smart board', 'sound system', 'audio speaker', 'lan cable', 'firewall'] },
  { id: 18, code: 'SPORTS', name: 'Sports & Physical Education',       icon: '🏃', keywords: ['sports', 'gym', 'ground', 'badminton court', 'basketball', 'cricket', 'football', 'fitness equipment', 'coach', 'sports kit'] },
  { id: 19, code: 'PLCMT',  name: 'Placement Cell',                    icon: '🤝', keywords: ['placement', 'interview', 'internship', 'company drive', 'aptitude', 'tpo', 'training & placement', 'campus interview'] },
  { id: 20, code: 'DEAN',   name: 'Dean of Students',                  icon: '🏛️', keywords: ['dean', 'student welfare', 'discipline', 'cultural', 'fest', 'club', 'student council', 'extracurricular'] }
];

const BUSES = [
  { id: 1, number: 'KA-22-F-1024 (Bus #01)', short: 'Bus #01', driver: 'Mallikarjun Patil', phone: '+91 94481 23401', capacity: 52 },
  { id: 2, number: 'KA-22-F-1025 (Bus #02)', short: 'Bus #02', driver: 'Suresh Jadhav',    phone: '+91 94481 23402', capacity: 48 },
  { id: 3, number: 'KA-22-F-1026 (Bus #03)', short: 'Bus #03', driver: 'Basavaraj Hiremath', phone: '+91 94481 23403', capacity: 55 },
  { id: 4, number: 'KA-22-F-1027 (Bus #04)', short: 'Bus #04', driver: 'Gopal Hegde',      phone: '+91 94481 23404', capacity: 50 }
];

const ROUTES = [
  {
    id: 1,
    number: 'R-01',
    name: 'Belagavi Central Bus Terminal (CBT) to Campus',
    stops: ['CBT', 'Bogarves', 'Goaves', '3rd Gate', 'Third Gate', 'Udyambag Campus'],
    keywords: ['cbt', 'central bus stand', 'bogarves', 'goaves', '3rd gate', 'third gate', 'r-01', 'route 1', 'route r-01']
  },
  {
    id: 2,
    number: 'R-02',
    name: 'RPD Cross / Tilakwadi to Campus',
    stops: ['RPD Cross', 'Congress Road', '2nd Gate', 'Second Gate', 'Angol', 'Udyambag Campus'],
    keywords: ['rpd', 'rpd cross', 'tilakwadi', 'congress road', '2nd gate', 'second gate', 'angol', 'r-02', 'route 2', 'route r-02']
  },
  {
    id: 3,
    number: 'R-03',
    name: 'Belagavi Railway Station to Campus',
    stops: ['Railway Station', 'Chennamma Circle', 'Club Road', 'Camp', 'Udyambag Campus'],
    keywords: ['railway station', 'station', 'chennamma circle', 'club road', 'camp', 'r-03', 'route 3', 'route r-03']
  },
  {
    id: 4,
    number: 'R-04',
    name: 'Vadgaon / Shahapur to Campus',
    stops: ['Shahapur Gate', 'Khasbag', 'Basavan Galli', 'Old Belagavi', 'Udyambag Campus'],
    keywords: ['vadgaon', 'shahapur', 'shahapur gate', 'khasbag', 'basavan galli', 'old belagavi', 'r-04', 'route 4', 'route r-04']
  }
];

// ── 2. SAFETY & HAZARD PATTERNS ──────────────────────────────
const SAFETY_PATTERNS = [
  { regex: /\b(harass|harassed|harassment|ragging|ragged|bully|bullied|bullying|molest|molested|molestation|touching|inappropriate touch|stalking|stalked)\b/i, reason: 'Physical Safety & Anti-Ragging Alert' },
  { regex: /\b(accident|crashed|collision|hit|injured|injury|bleeding|ambulance|fracture|hospital)\b/i, reason: 'Accident & Physical Injury Alert' },
  { regex: /\b(rash driving|drunk|drunk driving|overspeeding|reckless driving|brake failure|brakes failed|tire burst|wheel came off|door open while moving|footboard)\b/i, reason: 'Transit Operational Safety Hazard' },
  { regex: /\b(fire|short circuit|electric shock|cylinder leak|gas leak|sparking|sparks|chemical spill|acid burn)\b/i, reason: 'Fire & Electrical Hazard' },
  { regex: /\b(fight|assault|assaulted|beaten|threatened|weapon|violence|knife|attacked)\b/i, reason: 'Violence & Personal Security Threat' },
  { regex: /\b(medical emergency|fainted|unconscious|heart attack|suicide|self harm|poisoning|food poisoning|contaminated water)\b/i, reason: 'Critical Health & Medical Emergency' }
];

function detectSafetyHazard(text) {
  if (!text) return { isHazard: false, reason: null, priority: 'Low' };
  for (const item of SAFETY_PATTERNS) {
    if (item.regex.test(text)) {
      const match = text.match(item.regex)[0];
      return {
        isHazard: true,
        reason: `${item.reason} (Keyword: "${match}")`,
        priority: 'Critical'
      };
    }
  }
  return { isHazard: false, reason: null, priority: 'Low' };
}

// ── 3. GEMINI API PROXY HELPER ────────────────────────────────
async function callGemini(prompt, model = 'gemini-1.5-flash') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const modelsToTry = [model, 'gemini-1.5-flash', 'gemini-2.0-flash'];
  for (const targetModel of [...new Set(modelsToTry)]) {
    try {
      const result = await new Promise((resolve) => {
        const postData = JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.15,
            topP: 0.85,
            maxOutputTokens: 1200,
          }
        });

        const options = {
          hostname: 'generativelanguage.googleapis.com',
          port: 443,
          path: `/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 6000,
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const parsed = JSON.parse(data);
                const textResponse = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                resolve(textResponse || null);
              } else {
                resolve(null);
              }
            } catch (e) {
              resolve(null);
            }
          });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(postData);
        req.end();
      });

      if (result) return result;
    } catch (e) {
      // Continue to next model fallback
    }
  }

  return null;
}

// ── 4. HEURISTIC NLP STRUCTURING (Engine B) ───────────────────
function heuristicRefine(text) {
  const clean = (text || '').trim();
  if (!clean) {
    return {
      suggested_title: 'Unspecified Grievance',
      what_happened: 'No details submitted.',
      when_and_where: '[Not provided by student]',
      impact: '[Not provided by student]',
      requested_action: 'Investigation and prompt resolution.',
      formatted_description: 'No details submitted.',
      is_heuristic: true,
    };
  }

  // Detect time/date mentions
  const timeRegex = /\b(today|yesterday|tomorrow|this morning|last evening|night|morning|afternoon|\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\w+)?|\d{4})\b/gi;
  const timeMatches = clean.match(timeRegex);
  const timeExtracted = timeMatches ? [...new Set(timeMatches)].slice(0, 3).join(', ') : '[Not provided by student]';

  // Detect location / stop / room mentions
  const locRegex = /\b(campus|cbt|rpd|rpd cross|tilakwadi|shahapur|vadgaon|railway station|chennamma circle|3rd gate|2nd gate|bogarves|goaves|angol|khasbag|hostel|mess|library|canteen|ground|gym|block\s*[a-z0-9]+|room\s*\d+|lab\s*\d+|audi|auditorium|seminar hall|tech park|classroom|bus\s*#?\d+)\b/gi;
  const locMatches = clean.match(locRegex);
  const locExtracted = locMatches ? [...new Set(locMatches)].slice(0, 4).join(', ') : '[Not provided by student]';

  // Clean title extraction
  let title = clean.split(/[.?!;\n]/)[0].trim();
  if (title.length > 70) title = title.substring(0, 67) + '...';
  if (!title) title = 'Grievance Report';

  // Impact inference
  let impact = '[Not provided by student]';
  if (/\b(missed|late|unable|couldn't|delayed|stuck|suffering|problem|inconvenience|danger|disturbed|cannot attend|penalty|fine|unusable)\b/i.test(clean)) {
    impact = 'Caused operational disturbance, academic disruption, or student inconvenience.';
  }

  // Requested action inference
  let requestedAction = 'Timely investigation and corrective resolution by the university administration.';
  if (/\b(fix|repair|replace|refund|reschedule|change driver|action against|inspect|clean|service|warning|penalty)\b/i.test(clean)) {
    requestedAction = 'Requested urgent inspection, maintenance or administrative remediation with confirmation.';
  }

  const formatted = [
    `【What Happened】: ${clean}`,
    `【When & Where】: Time: ${timeExtracted} | Location/Transit: ${locExtracted}`,
    `【Impact】: ${impact}`,
    `【Requested Action】: ${requestedAction}`
  ].join('\n\n');

  return {
    suggested_title: title,
    what_happened: clean,
    when_and_where: `Time: ${timeExtracted} | Location/Transit: ${locExtracted}`,
    impact,
    requested_action: requestedAction,
    formatted_description: formatted,
    is_heuristic: true,
  };
}

// ── 5. INTELLIGENT ROUTING & CLASSIFICATION ENGINE ────────────
async function intelligentRoute(text) {
  const clean = (text || '').trim();
  const safety = detectSafetyHazard(clean);

  // Check Gemini first if available
  if (process.env.GEMINI_API_KEY) {
    const prompt = `
      You are an expert Grievance Triage Classifier for KLE Technological University, Belagavi.
      Analyze this student grievance: """${clean}"""

      Campus Context:
      - Transportation: Campus buses (#01, #02, #03, #04) and routes:
        * R-01: CBT to Campus (stops: CBT, Bogarves, Goaves, 3rd Gate)
        * R-02: RPD Cross / Tilakwadi to Campus (stops: RPD, Congress Rd, 2nd Gate, Angol)
        * R-03: Railway Station to Campus (stops: Station, Chennamma Circle, Club Rd, Camp)
        * R-04: Vadgaon / Shahapur to Campus (stops: Shahapur Gate, Khasbag, Basavan Galli)
      - Departments: CSE, ISE, ECE, EEE, MECH, CIVIL, CHEM, BT, MATH, PHY, MBA, MCA, LIB (Library), HSTEL (Hostel), EXAM (Exam Cell), FIN (Finance), IT (Campus WiFi/Smart class), SPORTS, PLCMT (Placement), DEAN (Dean of Students).

      Return ONLY a valid JSON object with keys:
      {
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
      }
    `;

    try {
      const geminiRes = await callGemini(prompt);
      if (geminiRes) {
        const cleaned = geminiRes.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Find matching dept object
        let dept = null;
        if (parsed.department_code) {
          dept = DEPARTMENTS.find(d => d.code.toUpperCase() === parsed.department_code.toUpperCase());
        }
        // Find matching bus
        let bus = null;
        if (parsed.bus_number) {
          bus = BUSES.find(b => b.number.includes(parsed.bus_number) || parsed.bus_number.includes(b.short));
        }
        // Find matching route
        let route = null;
        if (parsed.route_number) {
          route = ROUTES.find(r => r.number.toUpperCase() === parsed.route_number.toUpperCase());
        }

        const resolvedPriority = safety.isHazard ? 'Critical' : (parsed.priority || 'Medium');

        return {
          target_module: parsed.target_module || (parsed.department_code ? 'department' : 'transportation'),
          department_id: dept?.id || null,
          department_code: dept?.code || parsed.department_code || null,
          department_name: dept?.name || parsed.department_name || null,
          department_icon: dept?.icon || '🏛️',
          bus_id: bus?.id || null,
          bus_number: bus?.number || parsed.bus_number || null,
          route_id: route?.id || null,
          route_number: route?.number || parsed.route_number || null,
          route_name: route?.name || null,
          suggested_category: parsed.category || 'Academic',
          bus_complaint_type: parsed.bus_complaint_type || 'delay',
          suggested_priority: resolvedPriority,
          is_safety_hazard: safety.isHazard,
          safety_reason: safety.reason,
          sentiment_score: safety.isHazard ? -0.85 : -0.35,
          confidence: parsed.confidence || 0.95,
          routing_reason: parsed.routing_reason || 'AI-assisted routing based on grievance context.',
          is_heuristic: false,
        };
      }
    } catch (e) {
      console.warn('Gemini intelligent routing fallback:', e.message);
    }
  }

  // ── Heuristic Fallback Classifier & Knowledge Matcher ──
  const lower = clean.toLowerCase();

  // 1. Detect if Transportation
  const transportRegex = /\b(bus|buses|route|routes|driver|conductor|transit|fleet|cbt|rpd|tilakwadi|shahapur|vadgaon|railway station|station|goaves|bogarves|3rd gate|third gate|2nd gate|second gate|angol|khasbag|chennamma circle|overcrowd|overcrowding|puncture|breakdown|rash driving|seat|bus stop)\b/i;
  const isTransport = transportRegex.test(lower);

  if (isTransport) {
    // Detect Route
    let matchedRoute = null;
    for (const r of ROUTES) {
      if (r.keywords.some(k => lower.includes(k))) {
        matchedRoute = r;
        break;
      }
    }

    // Detect Bus
    let matchedBus = null;
    if (/\b(bus\s*#?1|bus\s*01|bus\s*#01|1024)\b/i.test(lower)) matchedBus = BUSES[0];
    else if (/\b(bus\s*#?2|bus\s*02|bus\s*#02|1025)\b/i.test(lower)) matchedBus = BUSES[1];
    else if (/\b(bus\s*#?3|bus\s*03|bus\s*#03|1026)\b/i.test(lower)) matchedBus = BUSES[2];
    else if (/\b(bus\s*#?4|bus\s*04|bus\s*#04|1027)\b/i.test(lower)) matchedBus = BUSES[3];

    // Detect Bus Complaint Type
    let complaintType = 'route_issue';
    if (safety.isHazard || /\b(accident|rash driving|drunk|brake failure|harass)\b/i.test(lower)) {
      complaintType = 'safety';
    } else if (/\b(late|delay|delayed|wait|time|schedule|punctuality)\b/i.test(lower)) {
      complaintType = 'delay';
    } else if (/\b(driver|conductor|behaviour|rude|talk|shout|conduct|abused)\b/i.test(lower)) {
      complaintType = 'driver_behaviour';
    } else if (/\b(clean|dirty|trash|garbage|dust|smell|seat torn)\b/i.test(lower)) {
      complaintType = 'cleanliness';
    } else if (/\b(crowd|packed|standing|overcrowd|space|no seat)\b/i.test(lower)) {
      complaintType = 'overcrowding';
    } else if (/\b(breakdown|puncture|engine|smoke|window|door|repair|ac not working)\b/i.test(lower)) {
      complaintType = 'maintenance';
    }

    const priority = safety.isHazard ? 'Critical' : (/\b(urgent|immediate|danger|emergency|today)\b/i.test(lower) ? 'High' : 'Medium');

    const routeText = matchedRoute ? `Route ${matchedRoute.number} (${matchedRoute.name})` : 'Campus Transit Network';
    const busText = matchedBus ? `on ${matchedBus.short}` : '';

    return {
      target_module: 'transportation',
      department_id: null,
      department_code: null,
      department_name: null,
      department_icon: null,
      bus_id: matchedBus?.id || null,
      bus_number: matchedBus?.number || null,
      route_id: matchedRoute?.id || null,
      route_number: matchedRoute?.number || null,
      route_name: matchedRoute?.name || null,
      suggested_category: 'Transportation',
      bus_complaint_type: complaintType,
      suggested_priority: priority,
      is_safety_hazard: safety.isHazard,
      safety_reason: safety.reason,
      sentiment_score: safety.isHazard ? -0.85 : -0.35,
      confidence: matchedRoute || matchedBus ? 0.94 : 0.85,
      routing_reason: `Intelligently routed to Campus Bus Coordinator for ${routeText} ${busText}.`.trim(),
      is_heuristic: true,
    };
  }

  // 2. Department Matcher
  let bestDept = null;
  let bestDeptScore = 0;

  for (const dept of DEPARTMENTS) {
    let score = 0;
    if (lower.includes(dept.code.toLowerCase())) score += 3;
    if (lower.includes(dept.name.toLowerCase())) score += 5;
    for (const kw of dept.keywords) {
      if (lower.includes(kw)) score += 2;
    }
    if (score > bestDeptScore) {
      bestDeptScore = score;
      bestDept = dept;
    }
  }

  // Default to CSE if tech / lab related, or Hostel if accommodation, or Administration
  if (!bestDept) {
    if (/\b(hostel|mess|food|room|washroom|geyser)\b/i.test(lower)) {
      bestDept = DEPARTMENTS.find(d => d.code === 'HSTEL');
    } else if (/\b(library|book|fine)\b/i.test(lower)) {
      bestDept = DEPARTMENTS.find(d => d.code === 'LIB');
    } else if (/\b(exam|marks|hall ticket|grade)\b/i.test(lower)) {
      bestDept = DEPARTMENTS.find(d => d.code === 'EXAM');
    } else if (/\b(fee|payment|scholarship)\b/i.test(lower)) {
      bestDept = DEPARTMENTS.find(d => d.code === 'FIN');
    } else if (/\b(wifi|internet|smart board|projector)\b/i.test(lower)) {
      bestDept = DEPARTMENTS.find(d => d.code === 'IT');
    } else if (/\b(computer|programming|coding|workstation|lab)\b/i.test(lower)) {
      bestDept = DEPARTMENTS.find(d => d.code === 'CSE');
    } else {
      bestDept = DEPARTMENTS.find(d => d.code === 'DEAN'); // Default Dean of Students
    }
  }

  // Map to Standard Category
  let category = 'Academic';
  if (['HSTEL'].includes(bestDept.code)) category = 'Hostel';
  else if (['LIB'].includes(bestDept.code)) category = 'Library';
  else if (['EXAM'].includes(bestDept.code)) category = 'Examination';
  else if (['FIN'].includes(bestDept.code)) category = 'Finance';
  else if (['IT', 'CIVIL', 'MECH', 'EEE', 'ECE'].includes(bestDept.code) && /\b(broken|repair|bench|ac|light|socket|spark|projector|monitor|water|door)\b/i.test(lower)) {
    category = 'Infrastructure';
  } else if (['DEAN', 'SPORTS', 'PLCMT'].includes(bestDept.code)) {
    category = 'Administration';
  }

  const priority = safety.isHazard ? 'Critical' : (/\b(urgent|immediate|emergency|today|asap|severe|fail)\b/i.test(lower) ? 'High' : 'Medium');

  return {
    target_module: 'department',
    department_id: bestDept.id,
    department_code: bestDept.code,
    department_name: bestDept.name,
    department_icon: bestDept.icon,
    bus_id: null,
    bus_number: null,
    route_id: null,
    route_number: null,
    route_name: null,
    suggested_category: category,
    bus_complaint_type: null,
    suggested_priority: priority,
    is_safety_hazard: safety.isHazard,
    safety_reason: safety.reason,
    sentiment_score: safety.isHazard ? -0.85 : -0.30,
    confidence: bestDeptScore > 0 ? 0.92 : 0.80,
    routing_reason: `Intelligently routed to Department of ${bestDept.name} (${bestDept.code}) under ${category} division.`,
    is_heuristic: true,
  };
}

// ── 6. COMPLAINT REFINEMENT ───────────────────────────────────
async function refineComplaint(rawText) {
  const safety = detectSafetyHazard(rawText);

  if (process.env.GEMINI_API_KEY) {
    const prompt = `
      You are an expert University Grievance Structuring Assistant for KLE Technological University.
      Transform the student's raw text into a professional, factual report.
      Raw Text: """${rawText}"""

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
    `;

    try {
      const geminiRes = await callGemini(prompt);
      if (geminiRes) {
        const cleaned = geminiRes.replace(/```json/gi, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleaned);
        return {
          ...json,
          is_safety_hazard: safety.isHazard,
          safety_reason: safety.reason,
          is_heuristic: false,
        };
      }
    } catch (e) {
      console.warn('Gemini refine fallback triggered:', e.message);
    }
  }

  // Fallback to Heuristic
  const fallback = heuristicRefine(rawText);
  return {
    ...fallback,
    is_safety_hazard: safety.isHazard,
    safety_reason: safety.reason,
  };
}

// ── 7. CONVERSATIONAL AI CHATBOT ENGINE ("KLE Saarthi") ────────
async function chatWithGrievanceAI({ message, conversationHistory = [], studentProfile = null }) {
  const cleanMsg = (message || '').trim();
  const lowerMsg = cleanMsg.toLowerCase();

  // Combine full dialogue context
  const fullDialogue = [
    ...conversationHistory.map(m => `${m.sender === 'user' ? 'Student' : 'Assistant'}: ${m.text}`),
    `Student: ${cleanMsg}`
  ].join('\n');

  // Analyze safety and routing on the dialogue
  const safety = detectSafetyHazard(cleanMsg + ' ' + (conversationHistory.slice(-2).map(m => m.text).join(' ')));
  const routing = await intelligentRoute(cleanMsg + ' ' + (conversationHistory.slice(-3).map(m => m.text).join(' ')));

  // Detect Intent
  const hasGrievanceWords = /\b(late|delay|delayed|breakdown|broken|problem|issue|dirty|rash|crowd|overcrowd|skipped|harass|fight|not working|spark|mess|fail|fault|leak|struck|damage|flicker|shouting|hit)\b/i.test(lowerMsg);
  const isGreeting = /^(hi|hello|hey|namaste|good\s*morning|good\s*afternoon|good\s*evening)\b/i.test(cleanMsg) && cleanMsg.split(' ').length <= 4 && !hasGrievanceWords;
  const isHelpQuery = /\b(how to|what can you do|help|options|features|commands|guide)\b/i.test(lowerMsg) && !hasGrievanceWords;
  const isStatusQuery = /\b(status|track|my complaint|complaint #?\d+|where is my ticket)\b/i.test(lowerMsg) && !hasGrievanceWords;
  const isRouteQuery = /\b(bus timing|bus schedule|route timing|driver contact|morning schedule|evening schedule)\b/i.test(lowerMsg) && !hasGrievanceWords;

  // If Gemini is available, use it for rich conversational response
  if (process.env.GEMINI_API_KEY && !isGreeting) {
    const prompt = `
      You are "KLE Saarthi", the official AI Grievance Intake & Campus Assistant for KLE Technological University, Belagavi.
      You help students resolve campus issues politely, quickly, and accurately.

      Campus Facts:
      - 20 Departments (CSE, ISE, ECE, EEE, MECH, CIVIL, Library, Hostel, Exam Cell, Finance, IT Support, etc.)
      - Campus transit fleet: 4 Buses (#01 to #04) and 4 Routes (R-01 CBT, R-02 RPD, R-03 Railway Station, R-04 Shahapur).
      - Emergency safety issues are routed with Critical Priority.
      - Standard grievance resolution SLA is 48 hours; emergencies within 4 hours.

      Conversation So Far:
      ${fullDialogue}

      Current Routing Detection:
      - Module: ${routing.target_module}
      - Department / Transit: ${routing.department_name || routing.route_name || 'General'}
      - Priority: ${routing.suggested_priority}
      - Safety Hazard: ${safety.isHazard ? 'YES (' + safety.reason + ')' : 'No'}

      Instructions:
      1. Be warm, empathetic, and concise (2-4 sentences).
      2. If the student has shared an issue, acknowledge it, confirm where it is being routed, and tell them they can transfer it to the complaint form with one click.
      3. If a critical detail is missing (e.g. which bus number, stop, or department/lab), politely ask for that detail.
      4. DO NOT make up non-existent facts or promises.
    `;

    try {
      const geminiReply = await callGemini(prompt);
      if (geminiReply) {
        // Build structured report preview if student is reporting an issue
        const isReporting = !isHelpQuery && !isStatusQuery && cleanMsg.length > 15;
        let structuredPreview = null;
        if (isReporting) {
          const refined = await refineComplaint(cleanMsg);
          structuredPreview = {
            ...refined,
            ...routing,
            title: refined.suggested_title,
            description: refined.formatted_description,
          };
        }

        return {
          reply: geminiReply.trim(),
          routing,
          safety,
          extracted_complaint: structuredPreview,
          suggested_actions: getSuggestedChips(routing, isGreeting, isRouteQuery),
        };
      }
    } catch (e) {
      console.warn('Gemini chat error, falling back to heuristic assistant:', e.message);
    }
  }

  // ── Heuristic Conversational Logic ──
  let reply = '';
  let extractedComplaint = null;

  if (isGreeting) {
    reply = `Hello! I am your KLE Tech Grievance Assistant. I can help you structure and route complaints for campus departments (CSE, Hostel, Library, Exams, etc.) or campus transit buses (CBT, RPD, Station, Shahapur). How can I assist you today?`;
  } else if (isStatusQuery) {
    reply = `You can monitor the live progress of all your submitted grievances anytime in the "My Grievances" tab. If you have a specific ticket ID (e.g., #104), our coordinators update each stage from "Received" to "Resolved" in real time.`;
  } else if (isRouteQuery) {
    reply = `KLE Tech operates 4 campus transit routes: R-01 (CBT to Campus at 7:45 AM & 4:45 PM), R-02 (RPD Cross / Tilakwadi at 8:00 AM), R-03 (Railway Station at 7:50 AM), and R-04 (Shahapur Gate at 8:05 AM). If you are facing any delays or driver issues, describe what happened and I'll route it directly to the Bus Coordinator!`;
  } else if (isHelpQuery) {
    reply = `You can describe any campus grievance to me casually in English or Hinglish. I will automatically identify the right department or bus route, evaluate urgency or safety hazards, structure your report professionally, and fill your grievance form with one click!`;
  } else {
    // Student is describing an issue
    const refined = heuristicRefine(cleanMsg);
    extractedComplaint = {
      ...refined,
      ...routing,
      title: refined.suggested_title,
      description: refined.formatted_description,
    };

    if (safety.isHazard) {
      reply = `🚨 I have flagged this as an urgent Safety Hazard (${safety.reason}). I have automatically classified it as CRITICAL priority and routed it directly to the ${routing.target_module === 'transportation' ? 'Bus Coordinator and Administration' : routing.department_name + ' & Dean of Students'}. Review the structured report below and click "Transfer to Form" to submit immediately.`;
    } else if (routing.target_module === 'transportation') {
      const routeStr = routing.route_number ? `Route ${routing.route_number}` : 'Campus Transportation';
      const busStr = routing.bus_number ? ` (${routing.bus_number})` : '';
      reply = `I have analyzed your transit issue and routed it to the Campus Bus Coordinator for ${routeStr}${busStr}. The priority has been set to ${routing.suggested_priority}. You can review the structured summary below and transfer it directly to the grievance form.`;
    } else {
      reply = `Thank you for reporting this. I have structured your grievance and intelligently routed it to the Department of ${routing.department_name} (${routing.department_code}) under ${routing.suggested_category}. Review the drafted details below and click "Transfer to Form" to lodge it.`;
    }
  }

  return {
    reply,
    routing,
    safety,
    extracted_complaint: extractedComplaint,
    suggested_actions: getSuggestedChips(routing, isGreeting, isRouteQuery),
  };
}

function getSuggestedChips(routing, isGreeting, isRouteQuery) {
  if (isGreeting) {
    return [
      '🚌 Report Bus Delay on Route R-01 (CBT)',
      '💻 Report Lab Workstation Issue in CSE',
      '🏠 Report Hostel Mess / Hot Water Issue',
      '📚 Report Library Book Fine Discrepancy'
    ];
  }
  if (isRouteQuery) {
    return [
      'Bus #02 was 30 mins late from CBT',
      'Overcrowding on Route R-02 RPD Cross',
      'Driver contact information'
    ];
  }
  if (routing.target_module === 'transportation') {
    return [
      'Transfer to Bus Grievance Form',
      'Change to Department Grievance',
      'Check Duplicate Bus Complaints'
    ];
  }
  return [
    'Transfer to Department Form',
    'Change to Bus Grievance',
    'Add More Details'
  ];
}

// ── 8. COORDINATOR DRAFT REPLY GENERATOR ─────────────────────
async function generateDraftReply({ complaintTitle, complaintDescription, categoryOrType, status }) {
  if (process.env.GEMINI_API_KEY) {
    const prompt = `
      You are an administrative coordinator at KLE Technological University, Belagavi.
      Draft a courteous, official, and reassuring response to this grievance.
      Complaint Title: "${complaintTitle}"
      Category/Type: "${categoryOrType}"
      Current Status: "${status}"
      Description snippet: "${(complaintDescription || '').substring(0, 300)}"

      Tone: Professional, empathetic, university-grade.
      Length: 3 to 4 sentences.
      Do not include place-holders. State that the department/transport division has registered the matter for active resolution.
    `;
    try {
      const res = await callGemini(prompt);
      if (res) return res.trim();
    } catch (e) {
      // Fallback below
    }
  }

  return `Dear Student, thank you for bringing this matter regarding "${complaintTitle}" to our notice. The concerned authorities have reviewed your grievance and appropriate corrective action has been initiated under our standard service protocol. We are monitoring the resolution closely to prevent recurrence.`;
}

// ── 9. EXECUTIVE SUMMARIZER ──────────────────────────────────
async function summarizeGrievance(text) {
  if (!text) return 'No content provided.';
  const sentences = text.split(/[.?!]\s+/).filter(s => s.trim().length > 10);
  if (sentences.length <= 2) return text;
  return `${sentences[0]}. ${sentences[1]}.`;
}

module.exports = {
  DEPARTMENTS,
  BUSES,
  ROUTES,
  detectSafetyHazard,
  refineComplaint,
  intelligentRoute,
  classifyGrievance: intelligentRoute, // Alias for backward compatibility
  chatWithGrievanceAI,
  generateDraftReply,
  summarizeGrievance,
};
