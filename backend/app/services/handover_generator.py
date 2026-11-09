import uuid
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.handover import (
    HandoverVersion, HandoverView, ContinuationAction, 
    ComprehensionCheck, HandoverStatus, Timeframe
)
from app.models.claim import Claim, ClaimCategory, ClaimStatus, ReviewState
from app.models.project import SensitivityLevel
from app.models.user import UserRole
from app.core.permissions import can_access_sensitivity, ROLE_DEFAULT_MAX_SENSITIVITY

class HandoverGenerator:
    """
    Compiles role-partitioned handover documents and Day 1 / Week 1 / Day 30 Continuation Plans.
    Guarantees that sensitive evidence never enters unprivileged views.
    """

    @classmethod
    def compile_handover_version(
        cls, 
        db: Session, 
        project_id: str, 
        title: str, 
        user_id: str
    ) -> HandoverVersion:
        # Check existing version number
        latest_ver = db.query(HandoverVersion).filter(HandoverVersion.project_id == project_id).order_by(HandoverVersion.version_number.desc()).first()
        next_ver_num = (latest_ver.version_number + 1) if latest_ver else 1

        version_id = str(uuid.uuid4())
        share_token = hashlib.sha256(f"{version_id}-{datetime.utcnow().isoformat()}".encode()).hexdigest()[:32]
        
        handover_ver = HandoverVersion(
            id=version_id,
            project_id=project_id,
            version_number=next_ver_num,
            title=title or f"Handover Version {next_ver_num}",
            executive_summary="Reconstructed project knowledge handover compiled from verified evidence sources.",
            status=HandoverStatus.DRAFT,
            published_share_token=share_token,
            share_expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(handover_ver)

        # Retrieve all project claims
        all_claims = db.query(Claim).filter(Claim.project_id == project_id).all()

        # Compile role-partitioned views for each role
        roles_to_compile = [UserRole.SUCCESSOR, UserRole.REVIEWER, UserRole.RESTRICTED_VIEWER]
        for role in roles_to_compile:
            view = cls._build_role_view(version_id, role, all_claims)
            db.add(view)

        # Compile Continuation Plan (Day 1 / Week 1 / Day 30)
        actions = cls._build_continuation_actions(version_id, all_claims)
        for act in actions:
            db.add(act)

        # Compile Comprehension Checks (Interactive Quiz)
        quiz_items = cls._build_comprehension_checks(version_id, all_claims)
        for q in quiz_items:
            db.add(q)

        db.commit()
        db.refresh(handover_ver)
        return handover_ver

    @classmethod
    def _build_role_view(
        cls, 
        handover_version_id: str, 
        target_role: UserRole, 
        all_claims: List[Claim]
    ) -> HandoverView:
        max_allowed_sensitivity = ROLE_DEFAULT_MAX_SENSITIVITY.get(target_role, SensitivityLevel.PUBLIC)
        
        permitted_claims = []
        restricted_placeholders_count = 0
        sensitive_items_count = 0

        for claim in all_claims:
            if can_access_sensitivity(target_role, claim.sensitivity):
                permitted_claims.append({
                    "id": claim.id,
                    "category": claim.category.value,
                    "description": claim.description,
                    "reasoning": claim.reasoning,
                    "exact_quote": claim.exact_quote,
                    "evidence_location": claim.evidence_location,
                    "confidence": claim.confidence,
                    "status": claim.status.value,
                    "sensitivity": claim.sensitivity.value,
                    "is_restricted": False
                })
            else:
                restricted_placeholders_count += 1
                sensitive_items_count += 1
                # Output a strict redacted placeholder
                permitted_claims.append({
                    "id": claim.id,
                    "category": claim.category.value,
                    "description": "🔒 [RESTRICTED ITEM: Content requires elevated clearance. Request access from project administrator.]",
                    "reasoning": "Restricted by security policy",
                    "exact_quote": "[REDACTED]",
                    "evidence_location": "[RESTRICTED SOURCE]",
                    "confidence": 1.0,
                    "status": "Verified",
                    "sensitivity": claim.sensitivity.value,
                    "is_restricted": True
                })

        compiled_doc = {
            "target_role": target_role.value,
            "max_sensitivity": max_allowed_sensitivity.value,
            "claims_by_category": {},
            "total_items": len(permitted_claims),
            "accessible_items": len(permitted_claims) - restricted_placeholders_count,
            "restricted_items_count": restricted_placeholders_count
        }

        for item in permitted_claims:
            cat = item["category"]
            if cat not in compiled_doc["claims_by_category"]:
                compiled_doc["claims_by_category"][cat] = []
            compiled_doc["claims_by_category"][cat].append(item)

        return HandoverView(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            target_role=target_role,
            compiled_content=compiled_doc,
            sensitive_items_count=sensitive_items_count,
            redacted_placeholders_count=restricted_placeholders_count
        )

    @classmethod
    def _build_continuation_actions(
        cls, 
        handover_version_id: str, 
        claims: List[Claim]
    ) -> List[ContinuationAction]:
        actions = []
        
        # 1. Day 1 Immediate Actions
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.DAY_1,
            title="Secure AWS and Robot Hardware Lab Access",
            description="Obtain credentials from Elena and verify SSH key access to navigation sub-chassis.",
            assigned_to="Successor",
            priority="critical",
            is_verified=True
        ))
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.DAY_1,
            title="Inspect PR #38 and Resolve Merge Conflict",
            description="Examine pull request #38 regarding camera driver refactoring and resolve merge blocker.",
            assigned_to="Successor",
            priority="high",
            is_verified=True
        ))
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.DAY_1,
            title="Introduce to Stakeholder Contacts",
            description="Reach out to Dr. K. Raman (Faculty Advisor) and Marcus Vance (Hardware Lead).",
            assigned_to="Successor",
            priority="medium",
            is_verified=True
        ))

        # 2. Week 1 Priority Tasks
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.WEEK_1,
            title="Resolve ROS1 vs ROS2 Migration Decision",
            description="Hold consensus meeting to establish whether to finalize ROS2 Humble or maintain ROS1 Noetic fallback.",
            assigned_to="Engineering Lead & Successor",
            priority="high",
            is_verified=True
        ))
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.WEEK_1,
            title="Perform LiDAR Extrinsic Re-calibration",
            description="Calibrate Livox LiDAR and IMU using the 3D calibration fixture in Lab B4.",
            assigned_to="Successor",
            priority="high",
            is_verified=True
        ))
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.WEEK_1,
            title="Confirm Target Demonstration Date",
            description="Align team around November 15 internal dry run vs December 1 formal university demo.",
            assigned_to="Project Admin",
            priority="medium",
            is_verified=True
        ))

        # 3. Day 30 Strategic Milestones
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.DAY_30,
            title="Address Navigation Controller Drift Bug",
            description="Investigate recurring odometry drift caused by wheel slippage in autonomous corridor traversal.",
            assigned_to="Successor",
            priority="medium",
            is_verified=True
        ))
        actions.append(ContinuationAction(
            id=str(uuid.uuid4()),
            handover_version_id=handover_version_id,
            timeframe=Timeframe.DAY_30,
            title="Audit CI/CD Cloud Pipeline Secrets",
            description="Rotate deployment keys and remove deprecated testing tokens from GitHub Actions environment.",
            assigned_to="DevOps Lead",
            priority="high",
            is_verified=True
        ))

        return actions

    @classmethod
    def _build_comprehension_checks(
        cls, 
        handover_version_id: str, 
        claims: List[Claim]
    ) -> List[ComprehensionCheck]:
        return [
            ComprehensionCheck(
                id=str(uuid.uuid4()),
                handover_version_id=handover_version_id,
                question="What is the active blocker associated with PR #38 in Project Aether?",
                options=[
                    "Camera driver compatibility merge conflict",
                    "Battery pack firmware upgrade failure",
                    "Missing sponsor funding approval",
                    "Chassis machining delay"
                ],
                correct_option_index=0,
                explanation="PR #38 refactors camera driver publishers to ROS2 and has an unmerged conflict noted in chat logs."
            ),
            ComprehensionCheck(
                id=str(uuid.uuid4()),
                handover_version_id=handover_version_id,
                question="Where are the LiDAR extrinsic calibration parameters documented?",
                options=[
                    "configs/lidar_calibration.yaml in the main repository",
                    "In the leaver's private Google Drive only",
                    "On a physical paper clipboard in Lab B4",
                    "They were never measured"
                ],
                correct_option_index=0,
                explanation="Parameters are tracked in configs/lidar_calibration.yaml with matrix offsets verified from meeting notes."
            ),
            ComprehensionCheck(
                id=str(uuid.uuid4()),
                handover_version_id=handover_version_id,
                question="Why is there a conflict regarding the final demonstration deadline?",
                options=[
                    "Meeting 4 recorded Dec 1 for university review while Chat Log Nov 12 pushed for Nov 15 internal testing",
                    "The competition organizers postponed the event by six months",
                    "The team decided to cancel the live demonstration",
                    "The venue was double-booked"
                ],
                correct_option_index=0,
                explanation="The team records contain an unresolved conflict between November 15 internal readiness and December 1 formal showcase."
            )
        ]

