import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.gap_interview import GapQuestion, GapAnswer, GapStatus, GapType
from app.models.claim import Claim, ClaimStatus, ClaimCategory, ReviewState
from app.models.source import Source, SourceType, SourceChunk
from app.models.project import SensitivityLevel
from app.services.chunker import DeterministicChunker

class GapEngine:
    """
    Identifies missing ownership, unknown deployment steps, unconfirmed deadlines,
    and conflicting decisions. Synthesizes targeted questions for the leaver.
    """

    @classmethod
    def identify_project_gaps(cls, db: Session, project_id: str) -> List[GapQuestion]:
        existing_questions = db.query(GapQuestion).filter(GapQuestion.project_id == project_id).all()
        if existing_questions:
            return existing_questions

        claims = db.query(Claim).filter(Claim.project_id == project_id).all()
        created_questions = []

        # 1. Missing account / deployment credentials
        has_clear_cloud_owner = any("cloud" in c.description.lower() and "owner:" in c.description.lower() for c in claims)
        if not has_clear_cloud_owner:
            q = GapQuestion(
                id=str(uuid.uuid4()),
                project_id=project_id,
                question_text="Who currently holds root access and MFA credentials for the AWS Cloud deployment account?",
                context_category="Deployment & Access",
                detected_gap_type=GapType.ACCOUNT_RESPONSIBILITY,
                priority=1,
                status=GapStatus.PENDING,
                target_role="leaver"
            )
            db.add(q)
            created_questions.append(q)

        # 2. Conflicting ROS migration
        has_ros_conflict = any(c.status == ClaimStatus.CONFLICT and "ros" in c.description.lower() for c in claims)
        if has_ros_conflict:
            q = GapQuestion(
                id=str(uuid.uuid4()),
                project_id=project_id,
                question_text="Has the ROS2 Humble migration been finalized, or is the team freezing on ROS1 Noetic pending PR #38?",
                context_category="Decisions & Conflicts",
                detected_gap_type=GapType.CONFLICTING_DECISION,
                priority=1,
                status=GapStatus.PENDING,
                target_role="leaver"
            )
            db.add(q)
            created_questions.append(q)

        # 3. Unconfirmed demonstration deadline
        has_deadline_conflict = any(c.status == ClaimStatus.CONFLICT and "deadline" in c.description.lower() for c in claims)
        if has_deadline_conflict:
            q = GapQuestion(
                id=str(uuid.uuid4()),
                project_id=project_id,
                question_text="Which demonstration deadline is the agreed club target: November 15 or December 1?",
                context_category="Timeline & Milestones",
                detected_gap_type=GapType.UNCONFIRMED_DEADLINE,
                priority=2,
                status=GapStatus.PENDING,
                target_role="leaver"
            )
            db.add(q)
            created_questions.append(q)

        # 4. Missing sensor calibration ownership
        q = GapQuestion(
            id=str(uuid.uuid4()),
            project_id=project_id,
            question_text="Who is assigned to perform IMU and LiDAR extrinsic calibration on the physical test chassis?",
            context_category="Task Ownership",
            detected_gap_type=GapType.MISSING_OWNERSHIP,
            priority=2,
            status=GapStatus.PENDING,
            target_role="leaver"
        )
        db.add(q)
        created_questions.append(q)

        db.commit()
        return created_questions

    @classmethod
    def record_answer(
        cls, 
        db: Session, 
        question_id: str, 
        user_id: str, 
        answer_text: str, 
        status: GapStatus = GapStatus.ANSWERED
    ) -> GapAnswer:
        """
        Records the leaver's answer.
        Crucial requirement: 'Answers must become new labelled evidence, not automatically verified facts.'
        """
        question = db.query(GapQuestion).filter(GapQuestion.id == question_id).first()
        if not question:
            raise ValueError("Question not found")

        question.status = status
        
        answer = GapAnswer(
            id=str(uuid.uuid4()),
            question_id=question_id,
            answered_by=user_id,
            answer_text=answer_text
        )
        db.add(answer)

        # Create a new synthetic evidence source representing Leaver's interview response
        if status == GapStatus.ANSWERED and answer_text.strip():
            src_id = str(uuid.uuid4())
            interview_source = Source(
                id=src_id,
                project_id=question.project_id,
                filename=f"Gap-Interview-Response-{question.context_category.replace(' ', '_')}.txt",
                file_type=SourceType.MARKDOWN,
                sensitivity=SensitivityLevel.INTERNAL,
                consent_confirmed=True,
                source_metadata={"interview_question": question.question_text, "answered_by": user_id}
            )
            db.add(interview_source)

            # Chunk the answer
            chunks = DeterministicChunker.chunk_text(
                source_id=src_id,
                text=f"Q: {question.question_text}\nA: {answer_text}"
            )
            first_chunk_id = None
            for c_data in chunks:
                chunk = SourceChunk(
                    id=c_data["id"],
                    source_id=src_id,
                    chunk_index=c_data["chunk_index"],
                    content=c_data["content"],
                    original_content=c_data["original_content"],
                    line_start=c_data["line_start"],
                    line_end=c_data["line_end"],
                    pii_redacted_meta=c_data["pii_redacted_meta"]
                )
                db.add(chunk)
                if not first_chunk_id:
                    first_chunk_id = chunk.id

            answer.attached_evidence_source_id = src_id

            # Create an EVIDENCE-BACKED claim from the interview response
            # Note: NOT verified until reviewer confirms it!
            new_claim = Claim(
                id=str(uuid.uuid4()),
                project_id=question.project_id,
                category=ClaimCategory.DECISION if "decision" in question.context_category.lower() else ClaimCategory.TASK_OWNERSHIP,
                description=f"Leaver interview statement: {answer_text}",
                reasoning=f"Provided in response to gap inquiry: '{question.question_text}'",
                exact_quote=answer_text,
                source_id=src_id,
                chunk_id=first_chunk_id,
                evidence_location=f"{interview_source.filename}:L1",
                confidence=0.85,
                status=ClaimStatus.EVIDENCE_BACKED,
                sensitivity=SensitivityLevel.INTERNAL,
                review_state=ReviewState.PENDING
            )
            db.add(new_claim)

        db.commit()
        db.refresh(answer)
        return answer

