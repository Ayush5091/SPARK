import os
from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from app.routes import students, activities, requests, submissions, auth

app = FastAPI(title="AICTE Mini App API")

from fastapi import Request
import json

@app.middleware("http")
async def log_requests(request: Request, call_next):
    body = await request.body()
    with open("request_dump.log", "a") as f:
        f.write(f"Incoming request: {request.method} {request.url}\n")
        f.write(f"Headers: {request.headers}\n")
        f.write(f"Body: {body.decode()}\n")
        f.write("-" * 20 + "\n")
    response = await call_next(request)
    return response

from fastapi.middleware.cors import CORSMiddleware

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_secret = os.getenv("SESSION_SECRET_KEY")
if not session_secret:
    raise RuntimeError("SESSION_SECRET_KEY environment variable is not set")

app.add_middleware(
    SessionMiddleware,
    secret_key=session_secret
)

app.include_router(auth.router, prefix='/auth')
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(requests.router, prefix="/activity-requests", tags=["Activity Requests"])
app.include_router(submissions.router, prefix="/submissions", tags=["Submissions"])
app.include_router(activities.router, prefix="/activities", tags=["Activities"])


