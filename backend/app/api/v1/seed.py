from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.seed_data import seed_database

router = APIRouter(prefix="/seed", tags=["Seed Data"])

@router.post("/reset")
def reset_seed_data(db: Session = Depends(get_db)):
    project = seed_database(db, force=True)
    return {
        "status": "success",
        "message": "Project Aether synthetic demonstration dataset successfully seeded",
        "project_id": project.id,
        "project_name": project.name,
        "slug": project.slug
    }

