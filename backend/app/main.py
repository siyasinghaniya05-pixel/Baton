from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.sources import router as sources_router
from app.api.v1.claims import router as claims_router
from app.api.v1.evidence import router as evidence_router
from app.api.v1.gap_interview import router as gap_router
from app.api.v1.review import router as review_router
from app.api.v1.handovers import router as handovers_router
from app.api.v1.timeline import router as timeline_router
from app.api.v1.audit import router as audit_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.seed import router as seed_router

# BATON 2.0 Continuity Intelligence routers
from app.api.v1.continuity import router as continuity_router
from app.api.v1.graph import router as graph_router
from app.api.v1.decisions import router as decisions_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.missions import router as missions_router
from app.api.v1.runbooks import router as runbooks_router
from app.api.v1.drift import router as drift_router
from app.api.v1.security_lab import router as security_lab_router
from app.api.v1.collaboration import router as collaboration_router

from app.services.seed_data import seed_database

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=f"{settings.PROJECT_NAME} 2.0 API",
    description="Project Continuity Intelligence Platform – Pass the project, not just the files.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=prefix)
app.include_router(projects_router, prefix=prefix)
app.include_router(sources_router, prefix=prefix)
app.include_router(claims_router, prefix=prefix)
app.include_router(evidence_router, prefix=prefix)
app.include_router(gap_router, prefix=prefix)
app.include_router(review_router, prefix=prefix)
app.include_router(handovers_router, prefix=prefix)
app.include_router(timeline_router, prefix=prefix)
app.include_router(audit_router, prefix=prefix)
app.include_router(analytics_router, prefix=prefix)
app.include_router(seed_router, prefix=prefix)

# Register BATON 2.0 routers
app.include_router(continuity_router, prefix=prefix)
app.include_router(graph_router, prefix=prefix)
app.include_router(decisions_router, prefix=prefix)
app.include_router(assistant_router, prefix=prefix)
app.include_router(missions_router, prefix=prefix)
app.include_router(runbooks_router, prefix=prefix)
app.include_router(drift_router, prefix=prefix)
app.include_router(security_lab_router, prefix=prefix)
app.include_router(collaboration_router, prefix=prefix)

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        # Preload synthetic Project Aether dataset
        seed_database(db, force=False)
    finally:
        db.close()

@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "tagline": "Pass the project, not just the files.",
        "version": "2.0.0",
        "edition": "Continuity Intelligence Platform",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "version": "2.0.0"}
