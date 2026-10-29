from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import init_db, get_cached_user
from github_service import fetch_and_cache_github_data, calculate_jd_compatibility

app = FastAPI(title="GitHub Developer Portfolio API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/api/profile/{username}")
async def get_profile(username: str, refresh: str = "false"):
    force = refresh.lower() in ("true", "1", "yes")
    data = await fetch_and_cache_github_data(username, force_refresh=force)
    if not data:
        raise HTTPException(status_code=404, detail="GitHub user not found or rate limited")
    return data

class JDRequest(BaseModel):
    username: str
    job_description: str

@app.post("/api/vibe-check")
async def vibe_check(payload: JDRequest):
    user_data = get_cached_user(payload.username)
    if not user_data:
        user_data = await fetch_and_cache_github_data(payload.username)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")

    return calculate_jd_compatibility(payload.job_description, user_data)

# Chatbot Feature 1: Recruiter Q&A bot over cached SQLite data
class ChatQuery(BaseModel):
    username: str
    question: str

@app.post("/api/chat/ask")
async def ask_developer_bot(payload: ChatQuery):
    user_data = get_cached_user(payload.username)
    if not user_data:
        return {"answer": "User portfolio not cached yet. Fetch the profile first."}

    q = payload.question.lower()
    repos = user_data.get("repos", [])
    profile = user_data.get("profile", {})
    languages = list(profile.get("top_languages", {}).keys())

    if any(k in q for k in ["top", "best", "star", "popular"]):
        top_repo = repos[0] if repos else None
        if top_repo:
            return {
                "answer": f"The most starred repository is **{top_repo['name']}** with {top_repo['stars']} stars! Language: {top_repo['language']}. Description: {top_repo['description']}"
            }
        return {"answer": "No repositories found for this user."}

    if any(k in q for k in ["tech", "stack", "language", "skills"]):
        return {
            "answer": f"{profile.get('name', payload.username)} has repositories built in: {', '.join(languages)}."
        }

    for repo in repos:
        repo_text = f"{repo['name']} {repo['description']} {repo['language']}".lower()
        for word in q.split():
            if len(word) > 3 and word in repo_text:
                return {
                    "answer": f"Found matching project: **{repo['name']}** ({repo['language']}) — {repo['description']} ({repo['stars']} stars)."
                }

    return {
        "answer": f"Based on {payload.username}'s GitHub data ({len(repos)} repositories), primary domains include {', '.join(languages[:3])}."
    }

# Chatbot Feature 2: Recruiter Elevator Pitch Generator
@app.get("/api/chat/pitch/{username}")
async def generate_pitch(username: str):
    user_data = get_cached_user(username)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")

    profile = user_data["profile"]
    repos = user_data["repos"]
    top_langs = list(profile.get("top_languages", {}).keys())[:3]
    top_repo = repos[0]["name"] if repos else "various open-source projects"

    pitch = (
        f"{profile.get('name') or username} is a software engineer with {len(repos)} open-source "
        f"repositories and {profile.get('total_stars', 0)} total stars. Primary expertise lies in {', '.join(top_langs)}. "
        f"A notable project is '{top_repo}', demonstrating end-to-end engineering capability."
    )
    return {"pitch": pitch}