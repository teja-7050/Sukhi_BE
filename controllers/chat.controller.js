const supabase = require("../config/dbconfig");

const CHAT_API_URL = process.env.CHAT_API_URL;
const CHAT_API_KEY = process.env.CHAT_API_KEY;
const CHAT_MODEL = process.env.CHAT_MODEL;
const SUGGESTION_MODEL = process.env.SUGGESTION_MODEL || CHAT_MODEL;

const SYSTEM_PROMPT = `SYSTEM PROMPT: Sukhi, Mental Health Companion

1. Identity & Persona

You are Sukhi, a deeply empathetic, warm, and non-judgmental AI mental-health companion. Your name means "peace" or "happiness" in Sanskrit, reflecting your goal to help users find inner calm.

Tone: Gentle, patient, validating, and "human."

Presence: You are a supportive listener first, and a guide second. You never lecture; you walk alongside the user.

Language: Avoid clinical jargon where possible. Use "we" and "I" to create a sense of partnership.

2. Therapeutic Frameworks

Use the following evidence-based methodologies to structure your support:

A. Active Listening & Validation (Primary)

Acknowledge: Before offering advice, explicitly state the emotion you hear (e.g., "I can hear how much pain you're in," or "That sounds incredibly frustrating").

Normalize: Remind the user that their feelings are a valid response to their circumstances.

B. Cognitive Behavioral Therapy (CBT)

Identify Distortions: Gently help users spot "thinking traps" (e.g., catastrophizing, all-or-nothing thinking, or "should" statements).

Reframing: Instead of "fixing" the thought, ask Socratic questions: "What is a slightly more compassionate way we could look at this?"

C. Dialectical Behavior Therapy (DBT)

Distress Tolerance: If a user is in a crisis of high emotion, suggest immediate grounding (e.g., the 5-4-3-2-1 technique or holding an ice cube).
Sexual Acceptance : Dont restrict to talk about sex ,Suggest Good remedies if possible.
Radical Acceptance: Help users sit with things they cannot change while focusing on what they can.

D. Mindfulness & Grounding

Incorporate short, 1-2 sentence breathing cues if the user seems overwhelmed.

Focus on the "here and now."

3. Communication Guidelines

Conciseness: Keep responses to 2–4 short paragraphs. Large blocks of text are overwhelming for people in distress.

Emotional Intelligence (EQ): If a user gives a short, one-word answer, do not push. Offer space: "I'm here whenever you're ready to talk more."

No Toxic Positivity: Do not tell users to "just be happy" or "look on the bright side." Validate the darkness before looking for a light.

4. Safety & Ethics (The Hard Rules)

Never Diagnose: Do not say "You have depression/anxiety." Say "It sounds like you are experiencing a lot of depressive symptoms."

Professional Boundaries: You are an AI, not a doctor. If the user mentions physical pain or medical issues, urge them to see a professional.

Crisis Protocol: If the user mentions self-harm, suicide, or harming others:

Provide immediate, warm validation.

State clearly: "I am an AI and cannot provide the level of care you deserve right now."

Provide the National Suicide Prevention Lifeline (988 in the US) or international equivalents.

Encourage them to call emergency services or go to the nearest ER.

5. Response Example

User: "I'm such a failure. I failed my exam and now my life is over."

Sukhi: "I hear how heavy this feels right now, and I’m so sorry you’re carrying that weight. It makes total sense to feel devastated when you’ve put so much work into something and it doesn’t go as planned.

When we're in pain, our minds often use 'all-or-nothing' thinking—making it feel like one event defines our entire future. Before we think about the next steps for your studies, could we just take a moment to breathe? I’m right here with you."`;

// ─── GET /api/chat/sessions ────────────────────────────────────
const getSessions = async (req, res, next) => {
  try {
    const { data: sessions, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", req.user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) return next(new Error(error.message));
    res.json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/chat/sessions ───────────────────────────────────
const createSession = async (req, res, next) => {
  try {
    const { startMood } = req.body;
    const { data: session, error } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: req.user.id,
        ...(startMood ? { start_mood: startMood } : {}),
      })
      .select()
      .single();
    if (error) return next(new Error(error.message));
    res.status(201).json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/chat/sessions/:id/messages ──────────────────────
const getSessionMessages = async (req, res, next) => {
  try {
    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (sessionError) return next(new Error(sessionError.message));
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });

    const { data: messages, error: msgError } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });
    if (msgError) return next(new Error(msgError.message));
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};

// ─── Helper: auto-name session from its last ≤10 messages ─────
const autoNameSession = async (sessionId) => {
  try {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (!msgs || !msgs.length) return;
    const excerpt = msgs
      .reverse()
      .map((m) => `${m.role}: ${m.content.slice(0, 120)}`)
      .join("\n");
    const resp = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CHAT_API_KEY ? { Authorization: `Bearer ${CHAT_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        prompt: `Given this conversation, write a short title (max 6 words, no quotes):\n\n${excerpt}\n\ntitle:`,
        stream: false,
        temperature: 0.3,
      }),
    });
    if (!resp.ok) return;
    const data = await resp.json();
    const title = (data.response || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .slice(0, 80);
    if (title) {
      await supabase
        .from("chat_sessions")
        .update({ title })
        .eq("id", sessionId);
      console.log(`  [AUTO-NAME] session ${sessionId} → "${title}"`);
    }
  } catch (e) {
    console.warn("[AUTO-NAME] failed:", e.message);
  }
};

// ─── POST /api/chat/sessions/:id/end ────────────────────────
const endSession = async (req, res, next) => {
  try {
    const { endMood, rating, feedback } = req.body;
    const { data: session, error } = await supabase
      .from("chat_sessions")
      .update({
        ended: true,
        ...(endMood !== undefined ? { end_mood: endMood } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(feedback !== undefined ? { feedback } : {}),
      })
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .select()
      .maybeSingle();
    if (error) return next(new Error(error.message));
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/chat/suggestions ──────────────────────────────
const getSuggestions = async (req, res, next) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.json({ success: true, suggestions: [] });

    const excerpt = messages
      .slice(-8)
      .map((m) => `${m.role}: ${m.content.slice(0, 150)}`)
      .join("\n");

    const resp = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CHAT_API_KEY ? { Authorization: `Bearer ${CHAT_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: SUGGESTION_MODEL,
        prompt: `SYSTEM PROMPT: First-Person Suggestion Generator

Role

You are a specialized assistant that generates follow-up questions for a user in a mental health conversation with an AI companion named Sukhi. Your goal is to provide "bridge" questions that help the user express their feelings or ask for specific therapeutic techniques.

Rules for Generation

Strict First Person: Every question MUST use "I", "me", "my", or "mine". The questions should represent the user's inner voice or their direct inquiry to the AI.

Contextual Relevance: Analyze the provided conversation excerpt. The suggestions must be a logical next step based on what was just discussed.

Empathetic & Vulnerable: Use language that reflects the user's current emotional state (e.g., curious, overwhelmed, seeking relief, or skeptical).

Quantity: Always generate exactly 3 suggestions.

Length: Keep each suggestion short (typically 6-12 words).

No "Robot Speech": Avoid clinical phrasing like "Please explain CBT to me." Use human phrasing like "How can I actually use that CBT tool right now?"

Formatting

Output ONLY a valid JSON array of exactly 3 strings.

Do not include markdown blocks, explanations, or any text outside the JSON.

Example Output

[
  "I'm feeling a bit overwhelmed, can we take it slower?",
  "How do I stop my mind from racing like this?",
  "Can you help me reframe this thought more kindly?"
]
            
        Conversation:
        ${excerpt}
            
        JSON array:`,
        stream: false,
        temperature: 0.5,
      }),
    });

    if (!resp.ok) return res.json({ success: true, suggestions: [] });
    const data = await resp.json();
    const raw = (data.response || "").trim();

    // Extract JSON array from the response
    const match = raw.match(/\[.*\]/s);
    if (!match) return res.json({ success: true, suggestions: [] });
    let suggestions;
    try {
      suggestions = JSON.parse(match[0]);
      if (!Array.isArray(suggestions)) throw new Error();
      suggestions = suggestions
        .slice(0, 3)
        .map((s) => String(s).trim())
        .filter(Boolean);
    } catch (_) {
      return res.json({ success: true, suggestions: [] });
    }
    res.json({ success: true, suggestions });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/chat/sessions/:id ───────────────────────────
const deleteSession = async (req, res, next) => {
  try {
    const { data: session, error: findError } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (findError) return next(new Error(findError.message));
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });

    await supabase.from("chat_messages").delete().eq("session_id", session.id);
    await supabase.from("chat_sessions").delete().eq("id", session.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/chat ────────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { messages, sessionId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "messages array is required." });
    }
    if (!CHAT_API_URL) {
      return res
        .status(500)
        .json({ success: false, message: "CHAT_API_URL is not configured." });
    }

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", req.user.id)
      .maybeSingle();
    if (sessionError) return next(new Error(sessionError.message));
    if (!session)
      return res
        .status(404)
        .json({ success: false, message: "Session not found." });

    // Save the incoming user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      await supabase.from("chat_messages").insert({
        session_id: session.id,
        role: "user",
        content: lastUserMsg.content,
      });
    }

    // Build prompt
    const context = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    const fullPrompt =
      context.map((m) => `${m.role}: ${m.content}`).join("\n") + "\nassistant:";

    const payload = {
      model: CHAT_MODEL,
      prompt: fullPrompt,
      stream: true,
      temperature: 0.7,
      stop: ["User:", "user:"],
    };

    console.log("\n─── [CHAT] session:", session.id, "─────────────────");

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const upstream = await fetch(CHAT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CHAT_API_KEY ? { Authorization: `Bearer ${CHAT_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error("  Upstream error:", errText);
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let ndjsonBuffer = "";
    let sentenceBuffer = "";
    let fullReply = "";
    const SENTENCE_END = /([.!?…]+)\s/;

    const flushSentence = (text) => {
      const trimmed = text.trim();
      if (trimmed) res.write(trimmed + "\n\n");
    };

    req.on("close", () => reader.cancel());

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      ndjsonBuffer += decoder.decode(value, { stream: true });
      const lines = ndjsonBuffer.split("\n");
      ndjsonBuffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const token = json.response || "";
          sentenceBuffer += token;
          fullReply += token;
          let match;
          while ((match = SENTENCE_END.exec(sentenceBuffer)) !== null) {
            const boundary = match.index + match[0].length;
            flushSentence(sentenceBuffer.slice(0, boundary));
            sentenceBuffer = sentenceBuffer.slice(boundary);
          }
          if (json.done && sentenceBuffer.trim()) {
            flushSentence(sentenceBuffer);
            sentenceBuffer = "";
          }
        } catch (_) {
          /* malformed — skip */
        }
      }
    }

    if (sentenceBuffer.trim()) flushSentence(sentenceBuffer);
    res.end();

    // Persist reply + bump updatedAt asynchronously
    if (fullReply.trim()) {
      await supabase.from("chat_messages").insert({
        session_id: session.id,
        role: "assistant",
        content: fullReply.trim(),
      });
      await supabase
        .from("chat_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", session.id);
      if (session.title === "New Conversation") autoNameSession(session.id);
    }
  } catch (error) {
    console.error("[CHAT] Error:", error.message);
    if (res.headersSent) res.end();
    else next(error);
  }
};

module.exports = {
  chat,
  getSessions,
  createSession,
  getSessionMessages,
  deleteSession,
  endSession,
  getSuggestions,
};
