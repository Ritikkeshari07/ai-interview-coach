export const questionPrompt = (config, previous = []) => `You are a professional, encouraging interview coach. Generate exactly one ${config.difficulty} ${config.interviewType} interview question about ${config.subject}${config.role ? ` for a ${config.role} role` : ""}. ${config.instructions || ""}
Previously asked questions: ${previous.join(" | ") || "None"}. Do not repeat them. Return only the question text, no numbering or preamble.`;

// Candidate answers can be very long (e.g. pasted code). We cap what we feed into the prompt so the
// model's own JSON response has a predictable, bounded size and doesn't get cut off mid-generation.
const MAX_ANSWER_CHARS = 3000;
const truncateAnswer = (answer) => {
  if (!answer || answer.length <= MAX_ANSWER_CHARS) return answer || "[Skipped]";
  return `${answer.slice(0, MAX_ANSWER_CHARS)}\n[...answer truncated for length, evaluate what is shown...]`;
};

export const evaluationPrompt = ({ config, question, answer }) => `You are an objective ${config.interviewType} interviewer. Evaluate this candidate response. Return ONLY valid, complete JSON (no markdown, no truncation) matching exactly: {"score":number 0-10,"verdict":"string (max 20 words)","strengths":["string (max 12 words)", up to 3 items],"weaknesses":["string (max 12 words)", up to 3 items],"missingPoints":["string (max 12 words)", up to 3 items],"suggestions":["string (max 12 words)", up to 3 items],"idealAnswer":"string (max 60 words)","followUp":"string (max 20 words)"}. Keep every field concise so the full JSON object stays well under 800 words total - brevity matters more than exhaustiveness. For technical or coding answers assess correctness, relevance, completeness, depth, clarity, approach, complexity and edge cases where relevant. For HR answers assess relevance, communication, structure, confidence, professionalism and completeness. Be constructive but brief.
Subject: ${config.subject}; difficulty: ${config.difficulty}
Question: ${question}
Candidate answer: ${truncateAnswer(answer)}`;

export const reportPrompt = (config, results) => `You are a senior interview coach. Produce ONLY complete JSON (no truncation): {"overallFeedback":"string (max 60 words)","strongestAreas":["string (max 10 words)", up to 3 items],"weakestAreas":["string (max 10 words)", up to 3 items],"technicalAssessment":"string (max 40 words)","communicationAssessment":"string (max 40 words)","recommendations":["string (max 12 words)", up to 3 items]}. Keep the full JSON well under 600 words - brevity matters more than exhaustiveness. Summarize this ${config.interviewType} ${config.subject} interview:
${JSON.stringify(results).slice(0, 6000)}`;
