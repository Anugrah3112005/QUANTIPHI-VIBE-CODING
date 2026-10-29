import httpx
import re
from database import save_user_cache, get_cached_user

GITHUB_API_BASE = "https://api.github.com"

# Standard list of tech skills to cross-reference
TECH_KEYWORDS = {
    "python", "javascript", "typescript", "react", "vue", "angular", "node", "nodejs",
    "express", "fastapi", "django", "flask", "docker", "kubernetes", "aws", "gcp",
    "azure", "sql", "postgresql", "mysql", "mongodb", "redis", "graphql", "rest",
    "html", "css", "tailwind", "c++", "c#", "java", "go", "golang", "rust", "git"
}

async def fetch_and_cache_github_data(username: str, force_refresh: bool = False):
    # 1. Check local SQLite cache first to avoid rate limiting
    if not force_refresh:
        cached = get_cached_user(username)
        if cached:
            return cached

    headers = {"Accept": "application/vnd.github.v3+json"}
    
    async with httpx.AsyncClient() as client:
        # Fetch user profile
        user_res = await client.get(f"{GITHUB_API_BASE}/users/{username}", headers=headers)
        if user_res.status_code != 200:
            return None
        user_info = user_res.json()

        # Fetch repositories
        repos_res = await client.get(
            f"{GITHUB_API_BASE}/users/{username}/repos?per_page=100&sort=updated",
            headers=headers
        )
        repos_info = repos_res.json() if repos_res.status_code == 200 else []

    # 2. Server-side computation of total stars and language distribution
    total_stars = sum(r.get("stargazers_count", 0) for r in repos_info)
    
    lang_counts = {}
    for r in repos_info:
        lang = r.get("language")
        if lang:
            lang_counts[lang] = lang_counts.get(lang, 0) + 1

    profile_data = {
        "name": user_info.get("name") or username,
        "avatar_url": user_info.get("avatar_url"),
        "bio": user_info.get("bio") or "",
        "followers": user_info.get("followers", 0),
        "total_stars": total_stars,
        "top_languages": lang_counts
    }

    # 3. Store into SQLite cache
    save_user_cache(username, profile_data, repos_info)
    return get_cached_user(username)


def calculate_jd_compatibility(jd_text: str, user_data: dict) -> dict:
    """
    Server-side Job Description Matcher:
    Extracts tech keywords from JD and checks against cached languages and repos.
    """
    if not jd_text:
        return {"match_percentage": 0, "matched_skills": [], "missing_skills": []}

    tokens = set(re.findall(r'\b[a-zA-Z#+]+\b', jd_text.lower()))
    jd_skills = tokens.intersection(TECH_KEYWORDS)

    if not jd_skills:
        jd_skills = {t for t in tokens if len(t) > 3}

    # Gather user's known skills from cached languages and repo descriptions
    user_skills = set()
    for lang in user_data.get("profile", {}).get("top_languages", {}).keys():
        user_skills.add(lang.lower())

    for repo in user_data.get("repos", []):
        desc = (repo.get("description") or "").lower()
        name = (repo.get("name") or "").lower()
        for kw in TECH_KEYWORDS:
            if kw in desc or kw in name:
                user_skills.add(kw)

    matched = jd_skills.intersection(user_skills)
    missing = jd_skills - user_skills

    match_pct = round((len(matched) / len(jd_skills)) * 100) if jd_skills else 0

    return {
        "match_percentage": min(match_pct, 100),
        "matched_skills": list(matched),
        "missing_skills": list(missing)[:8]
    }