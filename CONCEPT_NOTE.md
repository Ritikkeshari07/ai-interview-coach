# AI Interview Coach — Concept Note

## Project title and application name
AI Interview Coach

## Problem statement
Students and freshers often lack affordable, timely and objective interview practice. Static question lists do not adapt to a learner’s response or reveal how to improve.

## Objective and target users
Provide a realistic, accessible AI interviewer for college students, B.Tech students, freshers and job seekers. Users configure a role-focused technical, HR, or mixed session and receive actionable feedback.

## Use case and experience
The user picks topic, difficulty, role, and question count; responds to one question at a time; reviews a 0–10 score, strengths, missing points, suggestions and model answer; then receives a final skills report. A learning assistant explains concepts at beginner, intermediate or advanced depth.

## LLM/API and key features
The server uses NVIDIA's hosted NIM API to call `nvidia/nemotron-3.5-lightning-30b-a3b` through an OpenAI-compatible Chat Completions endpoint (`AI_PROVIDER=nvidia`). It streams actual model deltas over SSE and uses structured JSON prompts for assessments. An OpenAI-compatible fallback path is also implemented and can be enabled by switching `AI_PROVIDER=openai`. Features include interview setup, adaptive question sequence, evaluation, report, local history, learning assistant and mobile UI.

## Stack and architecture
React/Vite frontend → Express/Node backend → NVIDIA NIM API (nvidia/nemotron-3.5-lightning-30b-a3b). Browser history is localStorage; active sessions are an MVP in-memory store. Docker packages the compiled frontend and backend in one image.

## Security and AWS deployment
The NVIDIA API key is read only by Node from environment variables; it is ignored by Git, excluded from Docker context, and never returned to the browser. Helmet, CORS, validation and rate limiting are enabled. Docker is deployable to Amazon ECS Express Mode, which provisions a load balancer with HTTPS, auto scaling and networking automatically. 

## Live application URL
https://ai-9a55e9eba5e3499098f3c97db3a07f09.ecs.ap-southeast-2.on.aws

## Convert to PDF
Open this Markdown file in VS Code, use a Markdown PDF extension or print the rendered preview to PDF. Ensure the live URL placeholder is updated before submitting.
