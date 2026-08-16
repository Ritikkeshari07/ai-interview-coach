import crypto from "node:crypto";
const sessions = new Map();
export const createSession = (config) => { const id = crypto.randomUUID(); const session = { id, config, results: [], createdAt: new Date().toISOString(), status: "active" }; sessions.set(id, session); return session; };
export const getSession = (id) => sessions.get(id);
export const addResult = (id, result) => { const session = sessions.get(id); if (!session) return null; session.results.push(result); return session; };
export const complete = (id, report) => { const session = sessions.get(id); if (!session) return null; session.status = "completed"; session.report = report; session.completedAt = new Date().toISOString(); return session; };
