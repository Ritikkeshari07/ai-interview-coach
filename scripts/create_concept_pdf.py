from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

OUT = "output/pdf/AI_Interview_Coach_Concept_Note.pdf"
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleCustom", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=31, textColor=colors.HexColor("#10271F"), alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle(name="SubTitle", parent=styles["Normal"], fontSize=10, leading=15, textColor=colors.HexColor("#146B5B"), alignment=TA_CENTER, spaceAfter=25))
styles.add(ParagraphStyle(name="H", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=18, textColor=colors.HexColor("#146B5B"), spaceBefore=12, spaceAfter=5))
styles.add(ParagraphStyle(name="BodyCustom", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.5, leading=16, textColor=colors.HexColor("#263B33"), spaceAfter=8))
styles.add(ParagraphStyle(name="Foot", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#60716B"), alignment=TA_CENTER))

def p(text, style="BodyCustom"):
    return Paragraph(text, styles[style])

def footer(canvas, doc):
    canvas.saveState(); canvas.setStrokeColor(colors.HexColor("#DCE2DC")); canvas.line(20*mm, 15*mm, 190*mm, 15*mm)
    canvas.setFont("Helvetica", 8); canvas.setFillColor(colors.HexColor("#60716B")); canvas.drawCentredString(105*mm, 10*mm, f"AI Interview Coach | Concept Note | Page {doc.page}"); canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=18*mm, bottomMargin=22*mm)
story = [p("AI INTERVIEW COACH", "TitleCustom"), p("Project Concept Note | Vibe Coding and AWS Deployment", "SubTitle")]
overview = [
    ("Project title and application name", "AI Interview Coach"),
    ("Problem statement", "Students, freshers, and job seekers often lack accessible, personalised, and objective interview practice. Static question lists cannot react to an answer or provide useful improvement guidance."),
    ("Objective", "Create a professional AI-powered practice environment that simulates technical, HR, and mixed interviews, evaluates answers, and turns feedback into measurable next steps."),
    ("Target users", "College and B.Tech students, freshers, early-career job seekers, and learners preparing for technical or HR interviews."),
    ("Use case", "A user selects an interview type, subject, difficulty, number of questions, target role, and optional instructions. The coach asks one question at a time, evaluates each response, then provides a detailed final report."),
    ("LLM model and API", "NVIDIA NIM hosted API, running nvidia/nemotron-3.5-lightning-30b-a3b via an OpenAI-compatible Chat Completions endpoint, with hidden reasoning tokens explicitly suppressed for clean structured output. An alternate OpenAI Responses API path and a simpler meta/llama-3.2-3b-instruct NVIDIA model are also supported behind the same provider switch. The API key is read exclusively by the Express backend from environment variables."),
]
for h, b in overview:
    story += [p(h, "H"), p(b)]
story += [p("Key features", "H")]
features = [[p("Interview setup", "BodyCustom"), p("Technical, HR or mixed mode; subject, difficulty, question count, role and custom instructions.")], [p("AI interview session", "BodyCustom"), p("One-at-a-time questions, timer, progress bar, answers, skips, end controls and real streamed question content.")], [p("Answer evaluation", "BodyCustom"), p("Score out of 10, verdict, strengths, weaknesses, missing points, suggestions, ideal answer and follow-up.")], [p("Final report and dashboard", "BodyCustom"), p("Overall score, assessment areas, recommendations, per-question reviews and browser-local interview history.")], [p("Learning assistant", "BodyCustom"), p("Progressive explanations at beginner, intermediate, or advanced depth with examples and interview pitfalls.")]]
table = Table(features, colWidths=[48*mm, 122*mm])
table.setStyle(TableStyle([("BACKGROUND",(0,0),(0,-1),colors.HexColor("#E9F5EA")),("GRID",(0,0),(-1,-1),0.35,colors.HexColor("#DCE2DC")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),7),("RIGHTPADDING",(0,0),(-1,-1),7),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
story += [table, Spacer(1, 10), p("Expected user experience and outcomes", "H"), p("The experience is designed to feel like a calm, realistic interview rather than a chatbot. Users see text arrive progressively, receive constructive feedback immediately after each answer, and leave with clear strengths, weak areas, and next practice actions.")]
story += [PageBreak(), p("Technology, Architecture, and Security", "TitleCustom"), Spacer(1, 8)]
details = [
    ("Technology stack", "Frontend: React, Vite, responsive CSS, React Router and Lucide. Backend: Node.js, Express, OpenAI-compatible SDK (NVIDIA NIM), Zod validation, Helmet, CORS and rate limiting. Deployment: Docker and Amazon ECS Express Mode."),
    ("Application architecture", "React/Vite browser client -> Express API -> NVIDIA NIM API (nemotron-3.5-lightning-30b-a3b). Express serves the compiled frontend in production. Active interview sessions use an in-memory MVP store; completed history is retained in the user's browser localStorage."),
    ("Streaming", "The backend requests NVIDIA NIM Chat Completions with stream:true. It forwards each delta.content chunk as a Server-Sent Event. The browser reads the response stream and updates the visible text token by token without artificial delays."),
    ("Prompting strategy", "Separate prompt templates handle question generation, technical/HR evaluation, final reporting, and learning assistance. Evaluation prompts require reliable JSON fields so feedback can be displayed consistently."),
    ("Security approach", "NVIDIA_API_KEY is never included in frontend code, HTML, Git, README examples, or Docker image layers. It is supplied at runtime through .env locally and Amazon ECS Express Mode secrets in deployment. Error responses avoid stack traces and internal configuration."),
    ("AWS deployment", "The application is packaged in a single Docker image, listens on 0.0.0.0:$PORT, includes GET /api/health, and is ready for Amazon ECR plus Amazon ECS Express Mode (AWS App Runner's recommended successor as of April 2026). Express Mode provisions the load balancer, HTTPS certificate, and final public URL automatically."),
    ("Expected outcomes", "Learners gain repeatable interview practice and immediately actionable feedback. The project demonstrates full-stack development, prompt engineering, secure LLM use, streaming UX, Docker containerisation, and cloud deployment."),
]
for h,b in details: story += [p(h,"H"),p(b)]
story += [Spacer(1,16), p("Live Application URL", "H"), p("https://ai-9a55e9eba5e3499098f3c97db3a07f09.ecs.ap-southeast-2.on.aws"), Spacer(1,20), p("Prepared for course submission. Deployed via Amazon ECS Express Mode.", "Foot")]
doc.build(story, onFirstPage=footer, onLaterPages=footer)
