# CodeLens AI - Hackathon Implementation Plan

## 🎯 Goal
Build **CodeLens AI** - a developer productivity platform that helps understand unfamiliar codebases instantly, diagnose production errors semantically, and auto-fix bugs autonomously.

**Your Goal:** Win this hackathon by building a working, impressive demo!

---

## 📋 Tech Stack Decision

After analyzing both documents, here's what we'll use:

### **Version 2 (FastAPI + ChromaDB + Inngest) - RECOMMENDED**

**Why this is better for you as a learner:**

1. **Python FastAPI Backend** - Easier to learn than Node.js for AI/ML work
2. **ChromaDB** - ZERO configuration needed. No cloud setup, no API keys, works offline
3. **Inngest** - Handles long background tasks automatically (free tier is enough)
4. **React + Vite Frontend** - Modern, fast, easy to learn

**Advantages over Version 1:**
- ✅ No database setup needed (ChromaDB runs locally)
- ✅ Python is easier for parsing and AI tasks
- ✅ Inngest prevents timeout issues automatically
- ✅ Better animated UI will impress judges more

---

## 🔑 API Keys You Need to Get

Before we start coding, you need to create accounts and get these keys:

### 1. **OpenAI API Key** (REQUIRED)
- Go to: https://platform.openai.com/api-keys
- Sign up / Login
- Click "Create new secret key"
- Copy the key (starts with `sk-...`)
- **Cost:** ~$5 credit (should be free for new accounts, or add $10)
- **Usage for demo:** Will cost less than $1 total

### 2. **Inngest Account** (REQUIRED)
- Go to: https://www.inngest.com
- Sign up (it's FREE)
- Create a new App called "codelens-ai"
- Go to "Keys" tab
- Copy both: **Event Key** and **Signing Key**
- **Cost:** FREE (their free tier is more than enough)

### 3. **GitHub Token** (OPTIONAL - only for private repos)
- Go to: https://github.com/settings/tokens
- Click "Generate new token (classic)"
- Select scopes: `repo` (full)
- Copy the token (starts with `ghp_...`)
- **Cost:** FREE
- **Note:** Only needed if you want to test with private repos. Public repos work without this.

---

## 🏗️ Project Structure

```
codelens-ai/
├── backend/                    # Python FastAPI
│   ├── main.py                 # Entry point
│   ├── inngest_client.py       # Background jobs
│   ├── routes/                 # API endpoints
│   ├── services/               # Core logic
│   ├── requirements.txt        # Dependencies
│   └── .env                    # Your API keys
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── App.jsx            # Main app
│   │   └── main.jsx           # Entry point
│   ├── package.json
│   └── .env                    # API URL
```

---

## 🎨 The 5 Core Features

### 1. **Codebase Ingestion**
Upload a ZIP file or paste GitHub URL → System parses all code files → Creates searchable embeddings

### 2. **Interactive Dependency Map**
Visual graph showing all files, functions, classes and how they connect

### 3. **Semantic Error Diagnosis**
Paste a production error → AI finds which files likely caused it

### 4. **Closed-Loop Auto-Fix Sandbox**
System automatically: clones repo → runs it → detects error → fixes it with GPT-4 → retries (up to 3 times)

### 5. **Chat with Codebase**
Ask questions in plain English about the code (like "Where is authentication handled?")

---

## 📅 Phase-by-Phase Build Plan

We'll build this in **6 phases**, testing after each phase. Each phase builds on the previous one.

---

### **PHASE 1: Foundation Setup** (Day 1 Morning - 2-3 hours)

**What we'll do:**
- Set up the project folders
- Install all dependencies
- Configure environment variables with your API keys
- Create the basic FastAPI backend
- Create the basic React frontend
- Test that both servers run

**You need to:**
- Provide the API keys when I ask
- Install Python (if not installed)
- Install Node.js (if not installed)

**Testing:** Both frontend and backend start without errors

---

### **PHASE 2: ChromaDB & Basic Ingestion** (Day 1 Afternoon - 3-4 hours)

**What we'll build:**
- ChromaDB setup (literally 10 lines of code!)
- File upload endpoint (ZIP files)
- Basic file parser (extract code files)
- Simple embedding generation
- Store data in ChromaDB

**Testing:** Upload a small ZIP with 2-3 files → See them stored in ChromaDB

---

### **PHASE 3: GitHub Integration & Full Parsing** (Day 1 Evening - 3-4 hours)

**What we'll add:**
- GitHub URL cloning
- Advanced AST parsing for JavaScript/Python (extract functions, classes)
- Inngest background job for long-running embedding
- Progress tracking for frontend

**Testing:** 
- Upload GitHub URL (e.g., small Express.js repo)
- See real-time progress
- Verify all functions/classes are extracted

---

### **PHASE 4: Dependency Map Visualization** (Day 2 Morning - 4-5 hours)

**What we'll build:**
- Backend endpoint to build dependency graph
- React Flow interactive graph
- Beautiful animated UI
- Click on nodes to see details

**This is the WOW factor for judges!**

**Testing:** See a beautiful animated graph of code dependencies

---

### **PHASE 5: Error Diagnosis** (Day 2 Afternoon - 3-4 hours)

**What we'll add:**
- Semantic search using ChromaDB
- Error text analysis
- Ranked results showing likely culprit files
- Beautiful result cards with similarity scores

**Testing:** Paste a real error → See it correctly identify the buggy file

---

### **PHASE 6: Auto-Fix Sandbox & Chat** (Day 2 Evening - 4-5 hours)

**What we'll complete:**
- Sandbox clone and run logic
- GPT-4 based auto-fix loop
- Before/after diff viewer
- Chat interface with codebase
- Final UI polish

**Testing:** 
- Full end-to-end: upload code → find error → auto-fix it
- Chat: Ask questions about the codebase

---

### **FINAL PHASE: Demo Preparation** (Final 2-3 hours)

**What we'll do:**
- Deploy frontend to Vercel (free, 2 clicks)
- Deploy backend to Railway or Render (free tier)
- Create demo script
- Test the full demo flow 3 times
- Record a backup video (in case live demo fails)

---

## 🎬 Demo Script for Judges

**Duration: 3-4 minutes max**

1. **[30 sec]** "CodeLens AI gives any developer X-ray vision into unfamiliar code in 60 seconds"
2. **[60 sec]** Upload a real GitHub repo (we'll use Express.js) → Show the embedding progress
3. **[60 sec]** Show the animated dependency map → Click a few nodes → Explain relationships
4. **[45 sec]** Paste a production error → Show semantic search finding the exact bug
5. **[30 sec]** Quick chat: "Where is routing handled?" → Show AI answer
6. **[15 sec]** (Optional) Show auto-fix sandbox results (can be pre-recorded if risky)

**One-liner for judges:**
> "CodeLens AI maps every dependency, traces any error to its source semantically, and autonomously patches bugs until they're fixed."

---

## 💰 Cost Breakdown

**Total cost to build and demo: ~$5-10**

- OpenAI Embeddings: ~$0.02 per repo (incredibly cheap!)
- OpenAI GPT-4 for fixes: ~$0.10 per fix attempt
- Inngest: FREE (free tier)
- ChromaDB: FREE (runs locally)
- Deployment: FREE (Vercel + Railway free tiers)

**Demo cost for judges:** Under $0.50

---

## 🚀 What Makes This a Winner

1. **Solves a REAL pain point** - Every dev struggles with unfamiliar codebases
2. **Actually uses AI intelligently** - Not just a chatbot wrapper
3. **Visual wow factor** - The dependency map is impressive
4. **Full working demo** - Not just slides
5. **Autonomous fixing** - The sandbox loop is genuinely innovative
6. **Production-ready feel** - With Framer Motion animations, it looks professional

---

## 📚 Learning Resources (if you get stuck)

- **FastAPI Tutorial:** https://fastapi.tiangolo.com/tutorial/
- **React Basics:** https://react.dev/learn
- **ChromaDB Docs:** https://docs.trychroma.com/
- **Inngest Docs:** https://www.inngest.com/docs

But don't worry - I'll guide you through every step! I'll explain what each piece of code does.

---

## ✅ Success Criteria

By the end, you'll have:
- ✅ A live, deployed web application
- ✅ All 5 core features working
- ✅ Beautiful, animated UI
- ✅ Tested with at least 3 different repos
- ✅ A rehearsed demo script
- ✅ Backup demo video

---

## 🎯 Next Steps

**What I need from you now:**

1. ✅ **Confirm you want to use Version 2** (Python FastAPI + ChromaDB + Inngest)
   - This is what I recommend because it's easier to learn and more impressive

2. 🔑 **Get the API keys** (this will take 15-30 minutes):
   - OpenAI API key
   - Inngest Event Key + Signing Key
   - (Optional) GitHub token

3. ⚙️ **Verify you have installed:**
   - Python 3.10 or higher
   - Node.js 18 or higher
   - Git

Once you confirm and get the keys, **we'll start with Phase 1 immediately!**

---

## 💪 Let's Win This!

You've done great research. The plan is solid. The tech is proven. 

We'll build this **phase by phase**, test everything, and make sure it works perfectly.

**Ready to start? Let me know when you have the API keys!**
