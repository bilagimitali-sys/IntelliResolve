const express = require('express');
const db      = require('../db');
const { protect } = require('../middleware/authMiddleware');
const {
  refineComplaint,
  intelligentRoute,
  classifyGrievance,
  chatWithGrievanceAI,
  generateDraftReply,
  summarizeGrievance,
} = require('../utils/aiService');
const router  = express.Router();

// ── HELPER: Check Duplicates ─────────────────────────────────
async function performDuplicateCheck({ title, description, module_type, department_id, route_id, bus_id }) {
  if (!title && !description) return { has_duplicate: false };

  const queryText = `${title || ''} ${description || ''}`.toLowerCase();
  const queryTokens = new Set(queryText.split(/\W+/).filter(t => t.length > 3));
  if (queryTokens.size === 0) return { has_duplicate: false };

  try {
    let candidates = [];
    if (module_type === 'transportation') {
      let sql = `
        SELECT bus_complaint_id AS id, title, description, status, created_at, route_id, bus_id
        FROM bus_complaints
        WHERE status NOT IN ('Resolved')
          AND created_at >= NOW() - INTERVAL 14 DAY
      `;
      const params = [];
      if (route_id) { sql += ' AND route_id = ?'; params.push(route_id); }
      if (bus_id)   { sql += ' AND bus_id = ?';   params.push(bus_id); }
      sql += ' ORDER BY created_at DESC LIMIT 30';
      const [rows] = await db.query(sql, params);
      candidates = rows;
    } else {
      let sql = `
        SELECT complaint_id AS id, title, description, status, created_at, department_id
        FROM complaints
        WHERE status NOT IN ('Resolved')
          AND created_at >= NOW() - INTERVAL 14 DAY
      `;
      const params = [];
      if (department_id) { sql += ' AND department_id = ?'; params.push(department_id); }
      sql += ' ORDER BY created_at DESC LIMIT 30';
      const [rows] = await db.query(sql, params);
      candidates = rows;
    }

    let bestMatch = null;
    let maxSimilarity = 0;

    for (const item of candidates) {
      const candTokens = new Set(`${item.title} ${item.description}`.toLowerCase().split(/\W+/).filter(t => t.length > 3));
      if (candTokens.size === 0) continue;

      let intersection = 0;
      for (const tok of queryTokens) {
        if (candTokens.has(tok)) intersection++;
      }
      const union = new Set([...queryTokens, ...candTokens]).size;
      const sim = intersection / union;

      // Bonus weighting if title words heavily overlap
      const titleTokens = new Set((title || '').toLowerCase().split(/\W+/).filter(t => t.length > 3));
      const candTitleTokens = new Set((item.title || '').toLowerCase().split(/\W+/).filter(t => t.length > 3));
      let titleOverlap = 0;
      for (const tt of titleTokens) {
        if (candTitleTokens.has(tt)) titleOverlap++;
      }
      const titleBonus = titleTokens.size > 0 ? (titleOverlap / titleTokens.size) * 0.2 : 0;
      const finalSim = Math.min(1.0, sim + titleBonus);

      if (finalSim > maxSimilarity) {
        maxSimilarity = finalSim;
        bestMatch = { ...item, similarity_score: Math.round(finalSim * 100) };
      }
    }

    if (maxSimilarity >= 0.38 && bestMatch) {
      const moduleName = module_type === 'transportation' ? 'bus complaint' : 'department grievance';
      return {
        has_duplicate: true,
        similarity_percentage: bestMatch.similarity_score,
        matched_complaint: {
          id: bestMatch.id,
          title: bestMatch.title,
          status: bestMatch.status,
          created_at: bestMatch.created_at,
          module_type: module_type || 'department',
        },
        message: `Similar open ${moduleName} found (#${bestMatch.id}: "${bestMatch.title}"). You can review it or still proceed if this is an independent issue.`,
      };
    }

    return { has_duplicate: false };
  } catch (err) {
    console.error('Duplicate query error:', err.message);
    return { has_duplicate: false };
  }
}

// ── POST /api/ai/chat (Conversational Grievance Chatbot) ──────
// Interactive multi-turn assistant for intake, guidance, and FAQ
router.post('/chat', protect, async (req, res) => {
  const { message, conversationHistory } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  try {
    const chatResponse = await chatWithGrievanceAI({
      message,
      conversationHistory: conversationHistory || [],
      studentProfile: req.user,
    });

    // If an extracted complaint was produced, check for duplicates in real-time!
    let duplicateCheck = { has_duplicate: false };
    if (chatResponse.extracted_complaint) {
      const c = chatResponse.extracted_complaint;
      duplicateCheck = await performDuplicateCheck({
        title: c.title,
        description: c.description || c.what_happened,
        module_type: c.target_module,
        department_id: c.department_id,
        route_id: c.route_id,
        bus_id: c.bus_id,
      });
    }

    res.json({
      ...chatResponse,
      duplicate_check: duplicateCheck,
    });
  } catch (err) {
    console.error('AI chat route error:', err);
    res.status(500).json({ error: 'AI Assistant temporarily unavailable. Please try again.' });
  }
});

// ── POST /api/ai/intelligent-route ────────────────────────────
// Determines Target Module (Dept vs Transit), Dept ID, Route ID, Bus ID, Priority & Safety
router.post('/intelligent-route', protect, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required for intelligent routing' });
  }

  try {
    const routingResult = await intelligentRoute(text);
    res.json(routingResult);
  } catch (err) {
    console.error('Intelligent routing error:', err);
    res.status(500).json({ error: 'Intelligent routing failed' });
  }
});

// ── POST /api/ai/refine-complaint ────────────────────────────
// Accessible by students during complaint composition
router.post('/refine-complaint', protect, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Please enter your complaint text to refine' });
  }

  if (text.length > 5000) {
    return res.status(400).json({ error: 'Text exceeds maximum length of 5000 characters' });
  }

  try {
    const refined = await refineComplaint(text);
    res.json(refined);
  } catch (err) {
    console.error('AI refine route error:', err);
    res.status(500).json({ error: 'Failed to refine complaint' });
  }
});

// ── POST /api/ai/classify ────────────────────────────────────
router.post('/classify', protect, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required for classification' });
  }

  try {
    const classification = await intelligentRoute(text);
    res.json(classification);
  } catch (err) {
    console.error('AI classify error:', err);
    res.status(500).json({ error: 'Classification failed' });
  }
});

// ── POST /api/ai/check-duplicates ────────────────────────────
// Checks similarity against open complaints submitted recently
router.post('/check-duplicates', protect, async (req, res) => {
  const { title, description, module_type, department_id, route_id, bus_id } = req.body;
  try {
    const result = await performDuplicateCheck({
      title,
      description,
      module_type,
      department_id,
      route_id,
      bus_id,
    });
    res.json(result);
  } catch (err) {
    console.error('Duplicate check error:', err);
    res.json({ has_duplicate: false });
  }
});

// ── POST /api/ai/draft-reply ─────────────────────────────────
// Assisted draft response for coordinators & admin
router.post('/draft-reply', protect, async (req, res) => {
  const { complaintTitle, complaintDescription, categoryOrType, status } = req.body;
  try {
    const draft = await generateDraftReply({
      complaintTitle: complaintTitle || 'Grievance',
      complaintDescription,
      categoryOrType: categoryOrType || 'General',
      status: status || 'Under Review',
    });
    res.json({ draft });
  } catch (err) {
    console.error('Draft reply error:', err);
    res.status(500).json({ error: 'Failed to generate draft reply' });
  }
});

// ── POST /api/ai/summarize ───────────────────────────────────
router.post('/summarize', protect, async (req, res) => {
  const { text } = req.body;
  try {
    const summary = await summarizeGrievance(text);
    res.json({ summary });
  } catch (err) {
    console.error('Summarize error:', err);
    res.status(500).json({ error: 'Failed to summarize text' });
  }
});

module.exports = router;
