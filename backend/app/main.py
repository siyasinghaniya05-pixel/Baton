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
from app.services.seed_data import seed_database

# Create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    description="Evidence-Linked Knowledge Handover Platform – Pass the project, not just the files.",
    version=settings.VERSION,
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
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

