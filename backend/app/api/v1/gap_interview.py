import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.gap_interview import GapQuestion, GapAnswer, GapStatus
from app.models.audit import AuditLog
from app.schemas.gap import GapQuestionOut, GapAnswerCreate, GapAnswerOut
from app.core.security import get_current_user
from app.services.gap_engine import GapEngine

router = APIRouter(prefix="/gap-interview", tags=["Gap Interview"])

@router.get("/project/{project_id}", response_model=List[GapQuestionOut])
def get_gap_questions(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    questions = GapEngine.identify_project_gaps(db, project_id)
    results = []
    for q in questions:
        answers = db.query(GapAnswer).filter(GapAnswer.question_id == q.id).all()
        q_out = GapQuestionOut(
            id=q.id,
            project_id=q.project_id,
            question_text=q.question_text,
            context_category=q.context_category,
            detected_gap_type=q.detected_gap_type,
            priority=q.priority,
            status=q.status,
            target_role=q.target_role,
            linked_claim_id=q.linked_claim_id,
            created_at=q.created_at,
            answers=[GapAnswerOut.from_orm(a) for a in answers]
        )
        results.append(q_out)
    return results

@router.post("/questions/{question_id}/answer", response_model=GapAnswerOut)
def answer_gap_question(
    question_id: str,
    ans_in: GapAnswerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Leaver, Admin, or Reviewer can answer gap questions
    if current_user.role not in [UserRole.LEAVER, UserRole.ADMIN, UserRole.REVIEWER]:
        raise HTTPException(status_code=403, detail="Only Leavers and Admins can answer gap questions")

    answer = GapEngine.record_answer(
        db=db,
        question_id=question_id,
        user_id=current_user.id,
        answer_text=ans_in.answer_text,
        status=GapStatus.ANSWERED
    )

    # Log to audit trail
    q = db.query(GapQuestion).filter(GapQuestion.id == question_id).first()
    al = AuditLog(
        id=str(uuid.uuid4()),
        project_id=q.project_id if q else None,
        user_id=current_user.id,
        action="gap_question_answered",
        target_type="gap_question",
        target_id=question_id,
        details={"question": q.question_text if q else "", "answer_length": len(ans_in.answer_text)}
    )
    db.add(al)
    db.commit()

    return answer

@router.post("/questions/{question_id}/skip")
def skip_gap_question(question_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(GapQuestion).filter(GapQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.status = GapStatus.SKIPPED
    db.commit()
    return {"status": "skipped", "question_id": question_id}

@router.post("/questions/{question_id}/mark-unknown")
def mark_unknown_gap_question(question_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(GapQuestion).filter(GapQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    q.status = GapStatus.UNKNOWN
    db.commit()
    return {"status": "marked_unknown", "question_id": question_id}

