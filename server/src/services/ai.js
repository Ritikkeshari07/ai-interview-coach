import OpenAI from "openai";
import { jsonrepair } from "jsonrepair";
import { questionPrompt, evaluationPrompt, reportPrompt } from "../prompts/interview.js";
import { learningPrompt } from "../prompts/learning.js";
import { mockQuestion, mockEvaluation, mockReport, skippedEvaluation } from "./mock.js";

const provider = () => process.env.AI_PROVIDER || "openai";
let cachedClient = null;
let cachedProvider = null;

const client = () => {
  const p = provider();
  if (cachedClient && cachedProvider === p) return cachedClient;

  if (p === "nvidia") {
    if (!process.env.NVIDIA_API_KEY) return null;
    cachedClient = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      timeout: 45000,
      maxRetries: 2
    });
  } else {
    if (!process.env.OPENAI_API_KEY) return null;
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000,
      maxRetries: 2
    });
  }

  cachedProvider = p;
  return cachedClient;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const isTransientError = (error) => {
  const status = Number(error?.status || error?.statusCode || 0);
  const code = String(error?.code || "").toUpperCase();
  return (
    status === 408 || status === 409 || status === 429 || status >= 500 ||
    ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_SOCKET"].includes(code)
  );
};

async function withProviderRetry(operation, label = "AI request") {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`${label} failed (attempt ${attempt + 1}/3):`, error?.code || error?.status || "unknown", error?.message || error);

      if (!isTransientError(error) || attempt === 2) throw error;
      await sleep(700 * (attempt + 1));
    }
  }
  throw lastError;
}
const model = () => provider() === "nvidia" ? (process.env.NVIDIA_MODEL || "meta/llama-3.2-3b-instruct") : (process.env.OPENAI_MODEL || "gpt-5.6");
// Some NVIDIA NIM models (e.g. Nemotron reasoning models) default to emitting hidden "thinking" tokens
// that eat into max_tokens and can crowd out (or fully replace) the visible answer. We don't need
// chain-of-thought for interview questions or structured JSON, so we turn it off via the NIM-specific
// chat_template_kwargs field. IMPORTANT: unlike the Python OpenAI SDK, the Node SDK has no "extra_body"
// remapping - custom provider fields must be spread directly into the top-level request params object,
// or they get silently sent as a literal (and ignored) "extra_body" key instead of being applied.
const nvidiaThinkingOff = { chat_template_kwargs: { enable_thinking: false } };
// Second line of defense: NVIDIA's own reasoning-model docs show a "detailed thinking off" system
// message as another supported way to suppress chain-of-thought on some Nemotron variants. Combining
// both signals is harmless for models that ignore one of them and gives extra insurance against leaks.
const nvidiaMessages = (prompt) => [{ role: "system", content: "detailed thinking off" }, { role: "user", content: prompt }];
// MOCK_AI explicitly enables deterministic local testing, even on a machine that has a key configured.
export const isMock = () => process.env.MOCK_AI === "true" || (!client() && process.env.MOCK_AI !== "false");
// Strips markdown code fences and any leaked <think>...</think> reasoning traces, then extracts the
// first {...} candidate and parses it. If the model's output was cut off mid-generation (hit its token
// limit before finishing the JSON - common with long candidate answers), a plain JSON.parse fails even
// though most of the data is intact; jsonrepair salvages that by closing unterminated strings/brackets
// so we can still return the fields the model did finish generating, instead of a hard error.
function extractJson(raw) {
  if (!raw) throw new Error("Empty response from AI provider.");
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) text = fenceMatch[1].trim();
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in AI response.");
  const end = text.lastIndexOf("}");
  const candidate = end > start ? text.slice(start, end + 1) : text.slice(start);
  try { return JSON.parse(candidate); }
  catch { return JSON.parse(jsonrepair(candidate)); }
}
export async function streamText(res, prompt, mockText) {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" }); res.flushHeaders();
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  try {
    if (isMock()) { send("token", { text: mockText }); send("done", {}); return res.end(); }
    if (provider() === "nvidia") {
      const stream = await withProviderRetry(
        () => client().chat.completions.create({
          model: model(),
          messages: nvidiaMessages(prompt),
          temperature: 0.2,
          max_tokens: 1200,
          stream: true,
          ...nvidiaThinkingOff
        }),
        "NVIDIA streaming request"
      );
      for await (const chunk of stream) { const text = chunk.choices?.[0]?.delta?.content; if (text) send("token", { text }); }
    } else {
      const stream = await withProviderRetry(
        () => client().responses.create({ model: model(), input: prompt, stream: true, store: false }),
        "OpenAI streaming request"
      );
      for await (const event of stream) if (event.type === "response.output_text.delta") send("token", { text: event.delta });
    }
    send("done", {}); res.end();
  } catch (error) { console.error("AI streaming failed:", error?.status || "network", error?.message || "Unknown provider error"); send("error", { message: "The AI service is temporarily unavailable. Please try again." }); res.end(); }
}
export async function generateQuestion(config, previous) { if (isMock()) return mockQuestion(config, previous.length); const prompt = questionPrompt(config, previous); if (provider() === "nvidia") { const response = await withProviderRetry(
    () => client().chat.completions.create({
      model: model(),
      messages: nvidiaMessages(prompt),
      temperature: 0.2,
      max_tokens: 350,
      ...nvidiaThinkingOff
    }),
    "NVIDIA question request"
  ); return response.choices?.[0]?.message?.content?.trim() || "Could not generate a question."; } const response = await withProviderRetry(
    () => client().responses.create({ model: model(), input: prompt, store: false }),
    "OpenAI question request"
  ); return response.output_text.trim(); }
async function jsonResponse(prompt, fallback) {
  if (isMock()) return fallback();
  const raw = provider() === "nvidia"
    ? (await withProviderRetry(
        () => client().chat.completions.create({
          model: model(),
          messages: nvidiaMessages(prompt),
          temperature: 0.1,
          max_tokens: 2500,
          ...nvidiaThinkingOff
        }),
        "NVIDIA structured evaluation request"
      )).choices?.[0]?.message?.content
    : (await withProviderRetry(
        () => client().responses.create({ model: model(), input: prompt, store: false }),
        "OpenAI structured evaluation request"
      )).output_text;
  try { return extractJson(raw); } catch (e) { console.error("AI returned unparseable JSON:", e.message, "| raw (first 300 chars):", String(raw).slice(0, 300)); throw new Error("AI returned an invalid evaluation."); }
}
// Even after a successful repair of truncated JSON, some fields the model didn't get to generate yet
// will simply be absent. We backfill every expected field with a safe default so the frontend never
// has to guard against undefined - a partial-but-usable result beats a hard failure.
const withDefaults = (obj, defaults) => ({ ...defaults, ...obj });
// Skipped answers are evaluated deterministically, never by the model: an empty/whitespace-only
// answer always scores 0 with a clear "skipped" verdict. Relying on the model to correctly score an
// answer it never received is unreliable - it can (and did) hallucinate a plausible-looking score for
// an answer that doesn't exist, which is both wrong and misleading in the final report.
export const evaluate = async (data) => { if (!data.answer || !data.answer.trim()) return skippedEvaluation(); return withDefaults(await jsonResponse(evaluationPrompt(data), () => mockEvaluation(data.answer)), { score: 0, verdict: "", strengths: [], weaknesses: [], missingPoints: [], suggestions: [], idealAnswer: "", followUp: "" }); };
export const report = async (config, results) => withDefaults(await jsonResponse(reportPrompt(config, results), () => mockReport(results)), { overallFeedback: "", strongestAreas: [], weakestAreas: [], technicalAssessment: "", communicationAssessment: "", recommendations: [] });
export const streamLearning = (res, body) => streamText(res, learningPrompt(body), `Simple explanation\n${body.topic} is explained here in approachable terms for a ${body.level} learner.\n\nDetailed explanation\nBreak the problem into inputs, steps, and outputs.\n\nExample\nTry a small example and trace it step by step.\n\nCommon interview mistakes\nGiving only a definition without an example.\n\nRelated interview question\nHow would you apply ${body.topic} in a practical project?`);
