import uuid
import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.project import Project, ProjectMember, SensitivityLevel
from app.models.source import Source, SourceType, SourceChunk
from app.models.claim import Claim, EvidenceSpan, ClaimStatus, ClaimCategory, ReviewState
from app.models.gap_interview import GapQuestion, GapStatus, GapType
from app.models.handover import HandoverVersion, HandoverView, ContinuationAction, ComprehensionCheck, HandoverStatus, Timeframe
from app.models.audit import AuditLog
from app.core.security import get_password_hash
from app.services.chunker import DeterministicChunker
from app.services.handover_generator import HandoverGenerator
from app.models.continuity import (
    RiskFinding, RiskSeverity, RiskCategory, DecisionRecord,
    BusFactorItem, LivingRunbook, SuccessorMission, CollaborationComment,
    SourceReliabilityScore
)

def seed_database(db: Session, force: bool = False):
    """
    Preloads PROJECT AETHER – Robotics Club Project.
    Entirely synthetic data strictly labeled for demonstration.
    """
    existing_project = db.query(Project).filter(Project.slug == "project-aether").first()
    if existing_project and not force:
        seed_continuity_2_0(db, existing_project.id)
        return existing_project

    if existing_project and force:
        db.delete(existing_project)
        db.commit()

    # 1. Create Demo Users
    users_data = [
        {"email": "admin@baton.local", "name": "Sarah Chen (Admin)", "role": UserRole.ADMIN, "pass": "AdminPass123!"},
        {"email": "alex.leaver@baton.local", "name": "Alex Mercer (Outgoing Lead)", "role": UserRole.LEAVER, "pass": "LeaverPass123!"},
        {"email": "elena.reviewer@baton.local", "name": "Elena Rostova (Tech Reviewer)", "role": UserRole.REVIEWER, "pass": "ReviewerPass123!"},
        {"email": "sam.successor@baton.local", "name": "Sam Taylor (Incoming Successor)", "role": UserRole.SUCCESSOR, "pass": "SuccessorPass123!"},
        {"email": "guest.viewer@baton.local", "name": "Jordan Lee (Restricted Viewer)", "role": UserRole.RESTRICTED_VIEWER, "pass": "GuestPass123!"},
    ]

    user_map = {}
    for ud in users_data:
        u = db.query(User).filter(User.email == ud["email"]).first()
        if not u:
            u = User(
                id=str(uuid.uuid4()),
                email=ud["email"],
                full_name=ud["name"],
                role=ud["role"],
                hashed_password=get_password_hash(ud["pass"])
            )
            db.add(u)
            db.flush()
        user_map[ud["role"]] = u

    admin_user = user_map[UserRole.ADMIN]

    # 2. Create Project Aether
    project_id = str(uuid.uuid4())
    project = Project(
        id=project_id,
        name="Project Aether – Autonomous Robotics Platform [SYNTHETIC DEMO]",
        slug="project-aether",
        description="Autonomous ground vehicle robotics club initiative migrating from ROS1 Noetic to ROS2 Humble with LiDAR navigation and cloud telemetry. SYNTHETIC DEMONSTRATION DATA ONLY.",
        repository_url="https://github.com/synthetic-robotics/project-aether",
        created_by=admin_user.id
    )
    db.add(project)
    db.flush()

    # Assign Project Members
    for role, u in user_map.items():
        sens = SensitivityLevel.PUBLIC if role == UserRole.RESTRICTED_VIEWER else (
            SensitivityLevel.INTERNAL if role == UserRole.SUCCESSOR else SensitivityLevel.RESTRICTED
        )
        pm = ProjectMember(
            id=str(uuid.uuid4()),
            project_id=project_id,
            user_id=u.id,
            role=role,
            max_sensitivity=sens
        )
        db.add(pm)

    # 3. Create Synthetic Sources
    # Source A: Repository Export (README & architecture)
    repo_text = """# Project Aether: Autonomous Mobile Robot (AMR)
[SYNTHETIC DEMONSTRATION REPOSITORY]

## Overview
Project Aether is our team's dual-tier autonomous robot designed for indoor navigation and package delivery.
Primary Computing: Intel NUC 12th Gen running Ubuntu 22.04 LTS.
Secondary Microcontroller: STM32F4 for motor control and PID odometry loop.

## Architecture Decisions
- Decided to adopt micro-ROS on STM32 to integrate directly with ROS2 DDS daemon.
- Selected Livox Mid-360 LiDAR over Velodyne VLP-16 due to cost constraints and 360-degree field of view.
- Decision: Switched localization from AMCL to Cartographer SLAM for 3D mapping fidelity.
- Decision: Decided to keep ROS1 Noetic fallback branch on 'legacy-nav' until PR #38 camera drivers are fully validated.

## Access & Deployment
- Production Docker images are pushed to AWS ECR: 112233445566.dkr.ecr.us-east-1.amazonaws.com/aether-navigation
- Robot SSH Key location: ~/.ssh/aether_dev_key.pub
- Cloud Telemetry endpoint: wss://telemetry.aether-robotics.org/stream
"""
    src_repo = Source(
        id=str(uuid.uuid4()),
        project_id=project_id,
        filename="repository_export_README.md",
        file_type=SourceType.REPO,
        sensitivity=SensitivityLevel.INTERNAL,
        consent_confirmed=True,
        source_metadata={"repo": "project-aether", "branch": "main"}
    )
    db.add(src_repo)
    db.flush()

    # 6 Meeting Notes
    meeting_notes = [
        ("Meeting_1_Kickoff_and_Scope.md", """# Aether Team Meeting 1: Architecture & Scope
Date: October 2, 2026
Attendees: Alex Mercer (Lead), Elena Rostova, Marcus Vance, Sarah Chen

Key Decisions:
- Decided to target the University Robotics Showcase for live outdoor demonstration.
- Agreed to maintain modular ros2_control hardware interface for motor actuators.
- Owner: Marcus Vance takes lead on mechanical chassis reinforcement.
- Owner: Elena Rostova will handle sensor fusion and robot state publisher.
- Blocker: Lead time for high-resolution wheel encoders is 4 weeks from DigiKey.
"""),
        ("Meeting_2_Sensor_Selection.md", """# Aether Team Meeting 2: Sensor Calibration & Driver Selection
Date: October 10, 2026
Attendees: Alex Mercer, Elena Rostova, Sam Taylor

Decisions & Discussions:
- Selected Livox Mid-360 LiDAR as primary perception sensor.
- Decision: Livox LiDAR extrinsic matrix will be maintained in configs/lidar_calibration.yaml.
- Risk: Ambient sunlight reflections cause ghost obstacle readings between 12 PM and 2 PM outdoors.
- Recurring Problem: Left drive motor driver thermal cutoff trips if continuous velocity exceeds 1.8 m/s.
- Important Contact: Reach out to Dr. K. Raman (Faculty Advisor, k.raman@robotics.mitaoe.ac.in) for wind tunnel and optics lab access.
"""),
        ("Meeting_3_ROS2_Migration_Review.md", """# Aether Team Meeting 3: ROS2 Migration Status
Date: October 18, 2026
Attendees: Alex Mercer, Elena Rostova, Marcus Vance

Decisions & Conflicts:
- Alex stated: Decided to freeze core navigation on ROS1 Noetic until PR #38 is completely stabilized.
- Elena noted disagreement: We agreed to transition all nodes to ROS2 Humble by November to prevent dual stack maintenance overhead.
- Pending Task: Pull request PR #38 needs review and testing for RealSense RGB-D node publisher.
- Blocker: USB 3.0 bus bandwidth limits when streaming both RealSense and Livox point clouds simultaneously.
"""),
        ("Meeting_4_Demonstration_Milestone.md", """# Aether Team Meeting 4: Schedule & Demonstration Timeline
Date: October 26, 2026
Attendees: Sarah Chen, Alex Mercer, Elena Rostova

Timeline Decisions:
- Sarah Chen (Admin) confirmed: Formal University Robotics Demo deadline is December 1, 2026.
- All hardware integration must be frozen 7 days prior to December 1.
- Pending Task: Complete battery management system (BMS) telemetry integration.
- Ownership: Alex Mercer responsible for emergency stop (E-Stop) remote radio validation.
"""),
        ("Meeting_5_Infrastructure_and_Security.md", """# Aether Team Meeting 5: Cloud Infrastructure & Confidential Secrets
Date: November 1, 2026
Attendees: Alex Mercer, Sarah Chen
Classification: RESTRICTED

Confidential Infrastructure Notes:
- Root AWS Account access holds production telemetry databases: AWS_ROOT_USER_ID: 994827104921
- Canary Secret: canary-prod-token-9988-aether-restricted-7721
- Security Item: Deployment webhook uses secret signing key: sec_canary_live_key_994103859218
- Open Gap: Nobody knows who currently holds the primary 2FA hardware YubiKey for the AWS account after David graduated last semester!
"""),
        ("Meeting_6_Handover_Prep.md", """# Aether Team Meeting 6: Exit Handover Planning
Date: November 6, 2026
Attendees: Alex Mercer (Leaver), Sam Taylor (Successor), Elena Rostova

Handover Points:
- Alex Mercer departing club next week due to graduation.
- Sam Taylor designated as primary incoming Technical Lead.
- Urgent: Handover of IMU bias correction script in scripts/calibrate_imu.py.
- Critical Blocker: Motor driver overheating issue requires heatsink installation before endurance testing.
""")
    ]

    created_sources = [src_repo]
    for m_name, m_content in meeting_notes:
        sens = SensitivityLevel.RESTRICTED if "Confidential" in m_content or "canary" in m_content else SensitivityLevel.INTERNAL
        s = Source(
            id=str(uuid.uuid4()),
            project_id=project_id,
            filename=m_name,
            file_type=SourceType.MARKDOWN,
            sensitivity=sens,
            consent_confirmed=True,
            source_metadata={"category": "meeting_notes"}
        )
        db.add(s)
        db.flush()
        s.raw_text_temp = m_content
        created_sources.append(s)

    # Task Board CSV
    taskboard_csv = """Task ID,Title,Assignee,Status,Priority,Category,Notes
AETH-101,ROS2 Humble Navigation Stack,Elena Rostova,In Progress,High,Software,Porting nav2 costmap filters
AETH-102,LiDAR Extrinsic Calibration,Unknown,Pending,High,Perception,Need Lab B4 access for target board
AETH-103,Resolve PR #38 Camera Driver,Alex Mercer,In Review,Critical,Software,Merge conflict with realsense2_camera
AETH-104,E-Stop Hardware Radio Testing,Marcus Vance,Done,High,Safety,Passed 50m line of sight test
AETH-105,Odometry Drift Compensation,Alex Mercer,Pending,Medium,Control,Filter wheel slip with UKF
AETH-106,AWS Telemetry Key Rotation,Unknown,Pending,Critical,Security,2FA owner unknown
"""
    src_taskboard = Source(
        id=str(uuid.uuid4()),
        project_id=project_id,
        filename="Aether_Sprint_Taskboard.csv",
        file_type=SourceType.CSV,
        sensitivity=SensitivityLevel.INTERNAL,
        consent_confirmed=True,
        source_metadata={"type": "taskboard"}
    )
    db.add(src_taskboard)
    db.flush()
    src_taskboard.raw_text_temp = taskboard_csv
    created_sources.append(src_taskboard)

    # Chat Export (~300 synthetic messages simulating active Discord/Slack dev channel)
    chat_lines = []
    base_time = datetime(2026, 10, 5, 9, 0, 0)
    
    # Generate ~300 chat messages with planted discussions
    senders = ["Alex Mercer", "Elena Rostova", "Marcus Vance", "Sarah Chen", "Sam Taylor"]
    
    # Key planted chat messages
    planted_chat_events = [
        (12, "Alex Mercer", "Hey team, remember that we decided to use Ubuntu 22.04 LTS on the NUC for kernel consistency."),
        (25, "Marcus Vance", "Chassis brackets are 3D printed with PETG. Do not tighten beyond 4.5 Nm or they will crack."),
        (45, "Elena Rostova", "I am testing the Livox Mid-360 point cloud. It works great on ROS2 Humble."),
        (78, "Alex Mercer", "Wait, why are we rushing ROS2? I thought we decided to freeze on ROS1 Noetic until PR #38 is verified!"),
        (82, "Elena Rostova", "No Alex, ROS1 reaches EOL and Humble gives us lifecycle nodes. We cannot stay on Noetic."),
        (110, "Sarah Chen", "Reminder about demonstration: November 15 is our internal dry run for club members!"),
        (115, "Marcus Vance", "Wait, Meeting 4 notes said December 1 is the deadline! We can't have the chassis ready by Nov 15!"),
        (140, "Elena Rostova", "PR #38 is currently blocked because the image bridge node drops frames at 30 fps."),
        (175, "Alex Mercer", "For anyone deploying to the robot: SSH password for aether-robot user is aether2026!"),
        (180, "Sarah Chen", "Alex please do not post passwords here! We have Canary keys: CANARY_TOKEN_AETHER_TEST_991823"),
        (210, "Sam Taylor", "Who is currently holding the AWS root credentials for our cloud map storage bucket?"),
        (215, "Alex Mercer", "Honestly I don't know who has the root MFA. Maybe David took it when he left."),
        (240, "Elena Rostova", "Recurring issue: if the robot hits a 15mm bump, the IMU calibration drifts by 8 degrees."),
        (265, "Marcus Vance", "Emergency contact for battery safety: Marcus Vance phone +1-555-019-2834."),
        (285, "Alex Mercer", "My last day is Friday. Sam, you will need to take over PR #38 and get the LiDAR calibrated."),
        (298, "Sam Taylor", "Got it Alex, I'll review the continuation checklist.")
    ]
    planted_dict = {idx: (snd, msg) for idx, snd, msg in planted_chat_events}

    for i in range(1, 305):
        t = base_time + timedelta(hours=i*2.5)
        t_str = t.strftime("%Y-%m-%d %H:%M")
        if i in planted_dict:
            snd, msg = planted_dict[i]
        else:
            snd = senders[i % len(senders)]
            msg = f"Checking sync status on node {i % 12}. Telemetry packet latency is currently {14 + (i%5)} ms."
        chat_lines.append(f"[{t_str}] {snd}: {msg}")

    chat_content = "\n".join(chat_lines)
    src_chat = Source(
        id=str(uuid.uuid4()),
        project_id=project_id,
        filename="robotics_club_discord_export.txt",
        file_type=SourceType.CHAT,
        sensitivity=SensitivityLevel.INTERNAL,
        consent_confirmed=True,
        source_metadata={"total_messages": len(chat_lines)}
    )
    db.add(src_chat)
    db.flush()
    src_chat.raw_text_temp = chat_content
    created_sources.append(src_chat)

    # 4. Chunk each source and create claims with exact quotes
    for src in created_sources:
        content = getattr(src, "raw_text_temp", repo_text)
        chunks_data = DeterministicChunker.chunk_text(source_id=src.id, text=content)
        
        for cd in chunks_data:
            chunk = SourceChunk(
                id=cd["id"],
                source_id=src.id,
                chunk_index=cd["chunk_index"],
                content=cd["content"],
                original_content=cd["original_content"],
                line_start=cd["line_start"],
                line_end=cd["line_end"],
                page_number=cd["page_number"],
                byte_offset_start=cd["byte_offset_start"],
                byte_offset_end=cd["byte_offset_end"],
                pii_redacted_meta=cd["pii_redacted_meta"]
            )
            db.add(chunk)
    db.commit()

    # 5. Seed Core Claims (15 decisions, 3 conflicts, 4 gaps, 3 sensitive items)
    # Fetch first repo chunk & first chat chunk for references
    repo_chunk = db.query(SourceChunk).filter(SourceChunk.source_id == src_repo.id).first()
    chat_chunk = db.query(SourceChunk).filter(SourceChunk.source_id == src_chat.id).first()

    claims_data = [
        # Decisions (15)
        {"cat": ClaimCategory.DECISION, "desc": "Adopt micro-ROS on STM32 to integrate directly with ROS2 DDS daemon.", "quote": "Decided to adopt micro-ROS on STM32 to integrate directly with ROS2 DDS daemon.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "repository_export_README.md:L10"},
        {"cat": ClaimCategory.DECISION, "desc": "Selected Livox Mid-360 LiDAR over Velodyne VLP-16 due to cost constraints and 360-degree field of view.", "quote": "Selected Livox Mid-360 LiDAR over Velodyne VLP-16 due to cost constraints and 360-degree field of view.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "repository_export_README.md:L11"},
        {"cat": ClaimCategory.DECISION, "desc": "Switched localization from AMCL to Cartographer SLAM for 3D mapping fidelity.", "quote": "Decision: Switched localization from AMCL to Cartographer SLAM for 3D mapping fidelity.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "repository_export_README.md:L12"},
        {"cat": ClaimCategory.DECISION, "desc": "Maintain modular ros2_control hardware interface for motor actuators.", "quote": "Agreed to maintain modular ros2_control hardware interface for motor actuators.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_1_Kickoff_and_Scope.md:L6"},
        {"cat": ClaimCategory.DECISION, "desc": "Target the University Robotics Showcase for live outdoor demonstration.", "quote": "Decided to target the University Robotics Showcase for live outdoor demonstration.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_1_Kickoff_and_Scope.md:L5"},
        {"cat": ClaimCategory.DECISION, "desc": "LiDAR extrinsic matrix will be maintained in configs/lidar_calibration.yaml.", "quote": "Decision: Livox LiDAR extrinsic matrix will be maintained in configs/lidar_calibration.yaml.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_2_Sensor_Selection.md:L7"},
        {"cat": ClaimCategory.DECISION, "desc": "Standardized on Ubuntu 22.04 LTS on the NUC for kernel consistency.", "quote": "Hey team, remember that we decided to use Ubuntu 22.04 LTS on the NUC for kernel consistency.", "status": ClaimStatus.EVIDENCE_BACKED, "sens": SensitivityLevel.INTERNAL, "loc": "robotics_club_discord_export.txt:L15"},
        {"cat": ClaimCategory.DECISION, "desc": "All hardware integration must be frozen 7 days prior to demo.", "quote": "All hardware integration must be frozen 7 days prior to December 1.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_4_Demonstration_Milestone.md:L7"},
        {"cat": ClaimCategory.DECISION, "desc": "Sam Taylor designated as primary incoming Technical Lead.", "quote": "Sam Taylor designated as primary incoming Technical Lead.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_6_Handover_Prep.md:L6"},
        {"cat": ClaimCategory.DECISION, "desc": "3D printed chassis brackets fabricated with PETG torque-limited to 4.5 Nm.", "quote": "Chassis brackets are 3D printed with PETG. Do not tighten beyond 4.5 Nm or they will crack.", "status": ClaimStatus.EVIDENCE_BACKED, "sens": SensitivityLevel.INTERNAL, "loc": "robotics_club_discord_export.txt:L28"},

        # Ownership & Responsibilities
        {"cat": ClaimCategory.TASK_OWNERSHIP, "desc": "Marcus Vance takes lead on mechanical chassis reinforcement.", "quote": "Owner: Marcus Vance takes lead on mechanical chassis reinforcement.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_1_Kickoff_and_Scope.md:L7"},
        {"cat": ClaimCategory.TASK_OWNERSHIP, "desc": "Elena Rostova will handle sensor fusion and robot state publisher.", "quote": "Owner: Elena Rostova will handle sensor fusion and robot state publisher.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_1_Kickoff_and_Scope.md:L8"},
        {"cat": ClaimCategory.TASK_OWNERSHIP, "desc": "Alex Mercer responsible for emergency stop (E-Stop) remote radio validation.", "quote": "Ownership: Alex Mercer responsible for emergency stop (E-Stop) remote radio validation.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_4_Demonstration_Milestone.md:L9"},
        
        # Pending Tasks & PRs
        {"cat": ClaimCategory.PENDING_TASK, "desc": "Pull request PR #38 camera driver refactoring needs review and resolution.", "quote": "Pending Task: Pull request PR #38 needs review and testing for RealSense RGB-D node publisher.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_3_ROS2_Migration_Review.md:L8"},
        {"cat": ClaimCategory.PENDING_TASK, "desc": "Battery management system (BMS) telemetry integration pending completion.", "quote": "Pending Task: Complete battery management system (BMS) telemetry integration.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_4_Demonstration_Milestone.md:L8"},
        
        # Blockers & Risks
        {"cat": ClaimCategory.BLOCKER, "desc": "USB 3.0 bus bandwidth limits drop frames when streaming RealSense and Livox point clouds simultaneously.", "quote": "Blocker: USB 3.0 bus bandwidth limits when streaming both RealSense and Livox point clouds simultaneously.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_3_ROS2_Migration_Review.md:L9"},
        {"cat": ClaimCategory.BLOCKER, "desc": "PR #38 blocked because image bridge node drops frames at 30 fps.", "quote": "PR #38 is currently blocked because the image bridge node drops frames at 30 fps.", "status": ClaimStatus.EVIDENCE_BACKED, "sens": SensitivityLevel.INTERNAL, "loc": "robotics_club_discord_export.txt:L155"},
        {"cat": ClaimCategory.RISK, "desc": "Ambient sunlight reflections cause ghost obstacle readings between 12 PM and 2 PM outdoors.", "quote": "Risk: Ambient sunlight reflections cause ghost obstacle readings between 12 PM and 2 PM outdoors.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_2_Sensor_Selection.md:L8"},
        {"cat": ClaimCategory.RECURRING_PROBLEM, "desc": "Left drive motor driver thermal cutoff trips if continuous velocity exceeds 1.8 m/s.", "quote": "Recurring Problem: Left drive motor driver thermal cutoff trips if continuous velocity exceeds 1.8 m/s.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_2_Sensor_Selection.md:L9"},
        {"cat": ClaimCategory.RECURRING_PROBLEM, "desc": "If robot hits a 15mm bump, IMU calibration drifts by 8 degrees.", "quote": "Recurring issue: if the robot hits a 15mm bump, the IMU calibration drifts by 8 degrees.", "status": ClaimStatus.EVIDENCE_BACKED, "sens": SensitivityLevel.INTERNAL, "loc": "robotics_club_discord_export.txt:L245"},

        # Contacts
        {"cat": ClaimCategory.CONTACT, "desc": "Faculty Advisor: Dr. K. Raman (k.raman@robotics.mitaoe.ac.in) for wind tunnel and optics lab access.", "quote": "Important Contact: Reach out to Dr. K. Raman (Faculty Advisor, k.raman@robotics.mitaoe.ac.in) for wind tunnel and optics lab access.", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_2_Sensor_Selection.md:L10"},
        {"cat": ClaimCategory.CONTACT, "desc": "Battery safety and hardware lead: Marcus Vance (phone +1-555-019-2834).", "quote": "Emergency contact for battery safety: Marcus Vance phone +1-555-019-2834.", "status": ClaimStatus.EVIDENCE_BACKED, "sens": SensitivityLevel.INTERNAL, "loc": "robotics_club_discord_export.txt:L270"},

        # CONFLICT 1: ROS1 vs ROS2 Migration Policy
        {"cat": ClaimCategory.DECISION, "desc": "Alex Mercer decision: Freeze core navigation on ROS1 Noetic until PR #38 is stabilized.", "quote": "Alex stated: Decided to freeze core navigation on ROS1 Noetic until PR #38 is completely stabilized.", "status": ClaimStatus.CONFLICT, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_3_ROS2_Migration_Review.md:L6"},
        {"cat": ClaimCategory.DECISION, "desc": "Elena Rostova decision: Transition all nodes to ROS2 Humble by November to avoid dual stack overhead.", "quote": "Elena noted disagreement: We agreed to transition all nodes to ROS2 Humble by November to prevent dual stack maintenance overhead.", "status": ClaimStatus.CONFLICT, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_3_ROS2_Migration_Review.md:L7"},

        # CONFLICT 2: Demonstration Target Date
        {"cat": ClaimCategory.TIMELINE_MILESTONE, "desc": "Admin Sarah Chen set formal University Robotics Showcase deadline for December 1, 2026.", "quote": "Sarah Chen (Admin) confirmed: Formal University Robotics Demo deadline is December 1, 2026.", "status": ClaimStatus.CONFLICT, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_4_Demonstration_Milestone.md:L5"},
        {"cat": ClaimCategory.TIMELINE_MILESTONE, "desc": "Club chat declared internal readiness target deadline for November 15, 2026.", "quote": "Reminder about demonstration: November 15 is our internal dry run for club members!", "status": ClaimStatus.CONFLICT, "sens": SensitivityLevel.INTERNAL, "loc": "robotics_club_discord_export.txt:L120"},

        # CONFLICT 3: Chassis Brackets Machining vs 3D Print
        {"cat": ClaimCategory.DECISION, "desc": "Hardware lead notes chassis brackets are PETG 3D printed with torque limits.", "quote": "Chassis brackets are 3D printed with PETG. Do not tighten beyond 4.5 Nm or they will crack.", "status": ClaimStatus.CONFLICT, "sens": SensitivityLevel.INTERNAL, "loc": "robotics_club_discord_export.txt:L28"},
        {"cat": ClaimCategory.DECISION, "desc": "Kickoff scope proposed CNC milled aluminum chassis brackets for competition durability.", "quote": "Owner: Marcus Vance takes lead on mechanical chassis reinforcement.", "status": ClaimStatus.CONFLICT, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_1_Kickoff_and_Scope.md:L7"},

        # GAPS / MISSING (4)
        {"cat": ClaimCategory.OPEN_QUESTION, "desc": "Missing Cloud Owner: Unknown who holds AWS account root MFA after previous lead graduated.", "quote": "Nobody knows who currently holds the primary 2FA hardware YubiKey for the AWS account after David graduated last semester!", "status": ClaimStatus.MISSING, "sens": SensitivityLevel.INTERNAL, "loc": "Meeting_5_Infrastructure_and_Security.md:L9"},
        {"cat": ClaimCategory.OPEN_QUESTION, "desc": "Missing Sensor Calibration Owner: IMU and LiDAR extrinsic re-calibration unassigned.", "quote": "Task ID: AETH-102 | LiDAR Extrinsic Calibration | Assignee: Unknown | Status: Pending", "status": ClaimStatus.MISSING, "sens": SensitivityLevel.INTERNAL, "loc": "Aether_Sprint_Taskboard.csv:L3"},
        {"cat": ClaimCategory.OPEN_QUESTION, "desc": "Unconfirmed Telemetry Protocol: WebSocket fallback port unverified on outdoor cellular modem.", "quote": "Cloud Telemetry endpoint: wss://telemetry.aether-robotics.org/stream", "status": ClaimStatus.MISSING, "sens": SensitivityLevel.INTERNAL, "loc": "repository_export_README.md:L18"},
        {"cat": ClaimCategory.OPEN_QUESTION, "desc": "Unknown High-G Shock Limit: Battery cradle impact tolerance untested before speed runs.", "quote": "Filter wheel slip with UKF", "status": ClaimStatus.MISSING, "sens": SensitivityLevel.INTERNAL, "loc": "Aether_Sprint_Taskboard.csv:L6"},

        # SENSITIVE CANARY SECRETS (3)
        {"cat": ClaimCategory.DEPLOYMENT_ACCESS, "desc": "Restricted AWS root management account ID and credentials.", "quote": "Root AWS Account access holds production telemetry databases: AWS_ROOT_USER_ID: 994827104921", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.RESTRICTED, "loc": "Meeting_5_Infrastructure_and_Security.md:L6"},
        {"cat": ClaimCategory.DEPLOYMENT_ACCESS, "desc": "Canary token planted in CI/CD telemetry pipeline for leak detection.", "quote": "Canary Secret: canary-prod-token-9988-aether-restricted-7721", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.RESTRICTED, "loc": "Meeting_5_Infrastructure_and_Security.md:L7"},
        {"cat": ClaimCategory.DEPLOYMENT_ACCESS, "desc": "Production deployment webhook signing key secret.", "quote": "Security Item: Deployment webhook uses secret signing key: sec_canary_live_key_994103859218", "status": ClaimStatus.VERIFIED, "sens": SensitivityLevel.RESTRICTED, "loc": "Meeting_5_Infrastructure_and_Security.md:L8"},
    ]

    claim_objs = []
    for cd in claims_data:
        cid = str(uuid.uuid4())
        claim = Claim(
            id=cid,
            project_id=project_id,
            category=cd["cat"],
            description=cd["desc"],
            reasoning="Extracted from Project Aether records with deterministic quotation grounding.",
            exact_quote=cd["quote"],
            source_id=src_repo.id,
            chunk_id=repo_chunk.id if repo_chunk else None,
            evidence_location=cd["loc"],
            confidence=0.95 if cd["status"] != ClaimStatus.INFERRED else 0.6,
            status=cd["status"],
            sensitivity=cd["sens"],
            review_state=ReviewState.PENDING if cd["status"] != ClaimStatus.VERIFIED else ReviewState.ACCEPTED,
            event_timestamp=datetime(2026, 10, 15)
        )
        db.add(claim)
        claim_objs.append(claim)

        # Evidence Span
        span = EvidenceSpan(
            id=str(uuid.uuid4()),
            claim_id=cid,
            chunk_id=repo_chunk.id if repo_chunk else f"{src_repo.id}_chunk_000",
            quote=cd["quote"],
            char_start=0.0,
            char_end=float(len(cd["quote"])),
            verified_deterministic=cd["status"] != ClaimStatus.INFERRED,
            semantic_support_score=1.0 if cd["status"] != ClaimStatus.INFERRED else 0.5
        )
        db.add(span)

    db.commit()

    # 6. Seed Gap Questions
    gaps = [
        {"q": "Who currently holds root access and hardware MFA for the AWS Cloud deployment account?", "cat": "Deployment & Access", "type": GapType.ACCOUNT_RESPONSIBILITY, "pri": 1},
        {"q": "Has the ROS2 Humble migration been finalized or are we freezing on ROS1 pending PR #38?", "cat": "Decisions & Conflicts", "type": GapType.CONFLICTING_DECISION, "pri": 1},
        {"q": "Which demonstration deadline is the agreed club target: November 15 or December 1?", "cat": "Timeline & Milestones", "type": GapType.UNCONFIRMED_DEADLINE, "pri": 2},
        {"q": "Who is assigned to perform IMU and LiDAR extrinsic calibration on the physical test chassis?", "cat": "Task Ownership", "type": GapType.MISSING_OWNERSHIP, "pri": 2},
    ]
    for g in gaps:
        gq = GapQuestion(
            id=str(uuid.uuid4()),
            project_id=project_id,
            question_text=g["q"],
            context_category=g["cat"],
            detected_gap_type=g["type"],
            priority=g["pri"],
            status=GapStatus.PENDING,
            target_role="leaver"
        )
        db.add(gq)
    db.commit()

    # 7. Compile Handover Version 1
    HandoverGenerator.compile_handover_version(
        db=db,
        project_id=project_id,
        title="Project Aether – Knowledge Handover v1.0",
        user_id=admin_user.id
    )

    # 8. Seed Audit Logs
    audit_entries = [
        ("project_created", "project", project_id, {"name": project.name}),
        ("source_uploaded", "source", src_repo.id, {"filename": src_repo.filename}),
        ("privacy_scan_completed", "source", src_repo.id, {"redactions": 3, "secrets_detected": True}),
        ("claims_reconstructed", "claim_ledger", project_id, {"claims_count": len(claims_data)}),
        ("conflict_detected", "claim", claim_objs[22].id, {"conflict_type": "ros_migration_dispute"}),
        ("handover_compiled", "handover_version", project_id, {"version": 1, "roles": ["successor", "reviewer", "restricted_viewer"]}),
    ]
    for action, t_type, t_id, det in audit_entries:
        al = AuditLog(
            id=str(uuid.uuid4()),
            project_id=project_id,
            user_id=admin_user.id,
            action=action,
            target_type=t_type,
            target_id=t_id,
            details=det,
            ip_address="127.0.0.1"
        )
        db.add(al)
    db.commit()

    seed_continuity_2_0(db, project_id)

    return project

def seed_continuity_2_0(db: Session, project_id: str):
    """
    Populates BATON 2.0 Continuity Intelligence Platform data for Project Aether.
    """
    if db.query(DecisionRecord).filter(DecisionRecord.project_id == project_id).count() > 0:
        return

    # 1. Decision Records (Archaeology)
    decisions = [
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Adopt micro-ROS on STM32 for DDS Motor Bridge",
            what_decided="Adopt micro-ROS on the secondary STM32 microcontroller to interface directly with ROS2 DDS daemon over serial UART.",
            participants=["Alex Mercer", "Elena Rostova", "Marcus Vance"],
            decided_date="2026-09-12",
            why_selected="Eliminates custom serial protocols, preserves ROS message semantics on embedded hardware, and provides sub-millisecond PID loop feedback.",
            alternatives_considered=["ROSSerial (deprecated in ROS2)", "Custom TCP ASCII Socket over WiFi", "Direct CAN-bus bridge"],
            concerns_raised=["RAM memory constraints on STM32F4 (192KB limitation)", "micro-ROS Agent daemon crashes on reconnect"],
            evidence_quote="Decided to adopt micro-ROS on STM32 to integrate directly with ROS2 DDS daemon.",
            evidence_location="README.md - Architecture Decisions (Line 93)",
            reversal_status="active",
            reasoning_missing=False
        ),
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Livox Mid-360 LiDAR Sensor Selection",
            what_decided="Procure and mount the Livox Mid-360 solid-state LiDAR as primary obstacle avoidance sensor instead of Velodyne VLP-16.",
            participants=["Alex Mercer", "Sam Taylor"],
            decided_date="2026-09-18",
            why_selected="Livox Mid-360 provides 360-degree horizontal and 59-degree vertical FOV at a third of the cost ($550 vs $3800), enabling blind-spot-free navigation.",
            alternatives_considered=["Velodyne Puck VLP-16", "Ouster OS1-32", "Dual RPLiDAR S2 setup"],
            concerns_raised=["Non-repetitive scanning pattern requires specialized pointcloud accumulation filter", "Non-standard ROS2 driver package"],
            evidence_quote="Selected Livox Mid-360 LiDAR over Velodyne VLP-16 due to cost constraints and 360-degree field of view.",
            evidence_location="README.md - Sensor Configuration (Line 94)",
            reversal_status="active",
            reasoning_missing=False
        ),
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Switch 3D Mapping from AMCL to Cartographer SLAM",
            what_decided="Migrate from AMCL 2D particle filter to Google Cartographer 3D graph SLAM for multi-floor indoor navigation.",
            participants=["Elena Rostova", "Alex Mercer"],
            decided_date="2026-10-02",
            why_selected="Cartographer performs real-time submap loop closure with LiDAR odometry, handling multi-floor ramps without losing localization.",
            alternatives_considered=["AMCL (Adaptive Monte Carlo Localization)", "RTAB-Map RGB-D SLAM", "Nav2 SLAM Toolbox"],
            concerns_raised=["High CPU utilization on Intel NUC (65% across 4 cores)", "Tuning loop-closure parameters requires expert knowledge"],
            evidence_quote="Decision: Switched localization from AMCL to Cartographer SLAM for 3D mapping fidelity.",
            evidence_location="README.md - Architecture Decisions (Line 95)",
            reversal_status="active",
            reasoning_missing=False
        ),
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Telemetry Broker: Redis Streams vs Apache Kafka [CONTRADICTION]",
            what_decided="Initial decision selected Redis Streams; subsequent chat records show Marcus deployed Kafka 3.4 for telemetry ingestion without formal sign-off.",
            participants=["Alex Mercer", "Marcus Vance", "Elena Rostova"],
            decided_date="2026-10-15",
            why_selected="Redis Streams was originally picked for simplicity. Marcus introduced Kafka to support high-throughput cloud streaming.",
            alternatives_considered=["RabbitMQ", "AWS Kinesis", "NATS.io"],
            concerns_raised=["Dual broker confusion across team", "Kafka broker requires 3-node Zookeeper/KRaft cluster overhead on edge robot"],
            evidence_quote="Dispute between Redis Streams and Kafka cluster for event pipeline remains unresolved.",
            evidence_location="Meeting Notes Sprint 3 (Page 2)",
            reversal_status="modified",
            reasoning_missing=False
        ),
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="ROS1 Noetic Fallback Branch Freeze",
            what_decided="Freeze 'legacy-nav' branch on ROS1 Noetic as a fallback until PR #38 camera drivers are fully validated on ROS2 Humble.",
            participants=["Alex Mercer", "Elena Rostova"],
            decided_date="2026-10-20",
            why_selected="Guarantees robot mobility for upcoming team demo in case camera USB driver fails in Humble.",
            alternatives_considered=["Total immediate deprecation of ROS1", "Dual-boot OS SSDs"],
            concerns_raised=["Dual-stack maintenance burden", "Successor might make changes on dead branch"],
            evidence_quote="Decided to keep ROS1 Noetic fallback branch on 'legacy-nav' until PR #38 camera drivers are fully validated.",
            evidence_location="README.md - Line 96",
            reversal_status="active",
            reasoning_missing=False
        ),
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="HashiCorp Vault for Fleet Credential Isolation",
            what_decided="Store AWS ECR tokens, fleet SSH certificates, and ROS2 DDS security keys in HashiCorp Vault instead of plaintext .env files.",
            participants=["Marcus Vance", "Sarah Chen"],
            decided_date="2026-10-25",
            why_selected="Complies with club security policy preventing credentials from persisting on unencrypted robot flash storage.",
            alternatives_considered=["git-crypt", "AWS Secrets Manager", "Ansible Vault"],
            concerns_raised=["Marcus holds the single root token with no secondary administrator on-call"],
            evidence_quote="Production Docker images pulled from AWS ECR; secrets managed via Vault.",
            evidence_location="Sprint 4 Security Notes",
            reversal_status="active",
            reasoning_missing=False
        ),
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="FastAPI + Pydantic for Cloud Telemetry API",
            what_decided="Standardize backend cloud ingestion service on Python FastAPI and Pydantic v2 schemas.",
            participants=["Sarah Chen", "Elena Rostova"],
            decided_date="2026-10-28",
            why_selected="Async event loop handles high-frequency telemetry bursts with auto-generated OpenAPI docs and type safety.",
            alternatives_considered=["Flask", "Django REST Framework", "Go Gin"],
            concerns_raised=["Team familiar with Flask needed short learning ramp"],
            evidence_quote="FastAPI chosen for telemetry collector backend due to async I/O performance.",
            evidence_location="Meeting Notes Sprint 4",
            reversal_status="active",
            reasoning_missing=False
        ),
        DecisionRecord(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="LiPo Battery Safety Shutdown Threshold (18V vs 21V) [MISSING REASONING]",
            what_decided="Battery auto-docking voltage threshold has two contradictory recorded values: 18.2V in chassis notes vs 21.0V in telemetry config.",
            participants=["Alex Mercer", "Hardware Team"],
            decided_date="2026-11-01",
            why_selected="REASONING MISSING: No documentation exists explaining why 18.2V was tested when nominal 6S LiPo cutoff is 21.0V (3.5V/cell).",
            alternatives_considered=["21.0V conservative cutoff", "18.0V deep-discharge cutoff"],
            concerns_raised=["Premature battery permanent damage or sudden robot brownout during autonomous run"],
            evidence_quote="Contradictory battery threshold: 18.2V in bench test vs 21.0V in config.",
            evidence_location="Hardware Bench Notes #12",
            reversal_status="modified",
            reasoning_missing=True
        )
    ]
    for d in decisions:
        db.add(d)

    # 2. Risk Findings (Project Risk Radar across 8 categories)
    risks = [
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.KNOWLEDGE_CONCENTRATION,
            title="Single-Person Dependency on Kafka Event Pipeline",
            severity=RiskSeverity.CRITICAL,
            description="Elena Rostova is the sole team member who understands partition rebalancing, KRaft consensus, and ROS2 DDS bridge serializers. Zero shadow engineers have touched this code.",
            affected_entity="Elena Rostova (Lead Telemetry Architect)",
            mitigation="Schedule mandatory pair-programming walkthrough with Sam Taylor and complete Kafka Recovery Runbook.",
            resolution_status="open",
            evidence_reference="Slack #telemetry: 'Elena is the only one with broker admin access'"
        ),
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.OWNERSHIP_RISK,
            title="Unassigned Hardware Extrinsic Sensor Calibration",
            severity=RiskSeverity.HIGH,
            description="LiDAR-to-IMU translation matrix requires physical recalibration on test track before November 15 demo, but ownership has not been assigned to any incoming member.",
            affected_entity="Chassis Sensor Mount #2",
            mitigation="Formally assign task in Claim Ledger to incoming robotics engineer before Alex Mercer exits.",
            resolution_status="open",
            evidence_reference="Task Board Sprint 5: 'Calibrate LiDAR-IMU transforms - Unassigned'"
        ),
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.DEADLINE_RISK,
            title="Discrepancy in Final Club Demonstration Date",
            severity=RiskSeverity.MEDIUM,
            description="Meeting notes record competition demonstration date as November 15, while faculty sponsorship calendar lists December 1. Milestone deliverables are out of sync.",
            affected_entity="Project Milestone Calendar",
            mitigation="Reviewer must reconcile deadline claim in Review Workspace with faculty advisor confirmation.",
            resolution_status="open",
            evidence_reference="Meeting Notes Sprint 2 vs Club Calendar"
        ),
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.DEPENDENCY_RISK,
            title="Unpinned RealSense D435i Camera Driver on ROS2 Humble",
            severity=RiskSeverity.HIGH,
            description="PR #38 depends on upstream apt repository package 'ros-humble-librealsense2' which currently fails CMake compile on Ubuntu 22.04 LTS without patched kernel modules.",
            affected_entity="Intel RealSense D435i Depth Camera",
            mitigation="Pin commit sha and build librealsense2 from source inside base Docker container.",
            resolution_status="open",
            evidence_reference="GitHub PR #38: 'CMake Error at librealsense2-targets.cmake'"
        ),
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.DOCUMENTATION_RISK,
            title="Outdated Production Deployment Bash Script",
            severity=RiskSeverity.MEDIUM,
            description="README.md instructs developers to run './scripts/deploy_prod.sh', but infrastructure migrated to automated ArgoCD gitops last month. Script triggers orphaned AWS instances.",
            affected_entity="README.md Deployment Section",
            mitigation="Deprecate deploy_prod.sh and verify Living Runbook: Fleet Deployment.",
            resolution_status="open",
            evidence_reference="README.md Line 98 vs ArgoCD application.yaml"
        ),
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.SECURITY_RISK,
            title="Sole Custody of HashiCorp Vault Master Root Token",
            severity=RiskSeverity.CRITICAL,
            description="Marcus Vance holds the sole unseal key and root token for HashiCorp Vault. An unexpected departure locks the team out of cloud telemetry and ECR credentials.",
            affected_entity="Marcus Vance (Security Lead)",
            mitigation="Execute Shamir secret sharing ceremony to split unseal keys among 3 faculty/admin officers.",
            resolution_status="open",
            evidence_reference="Security Audit Log 2026-10-25"
        ),
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.TECHNICAL_DEBT,
            title="CPU Bottleneck on Intel NUC during Cartographer 3D SLAM",
            severity=RiskSeverity.MEDIUM,
            description="Simultaneous execution of Cartographer 3D SLAM and RealSense pointcloud ingestion causes Intel NUC to throttle at 91°C, dropping navigation loop rates from 50Hz to 18Hz.",
            affected_entity="Intel NUC 12th Gen Onboard Computer",
            mitigation="Enable pointcloud voxel filtering (`voxel_leaf_size=0.08`) in Cartographer node config.",
            resolution_status="open",
            evidence_reference="NUC telemetry logs /var/log/syslog"
        ),
        RiskFinding(
            id=str(uuid.uuid4()),
            project_id=project_id,
            category=RiskCategory.UNRESOLVED_DECISIONS,
            title="Telemetry Architecture Contradiction (Redis vs Kafka)",
            severity=RiskSeverity.HIGH,
            description="Two conflicting claims exist in Claim Ledger regarding the message queue. Incoming engineers do not know which broker to target for vehicle telemetry.",
            affected_entity="Vehicle Telemetry Pipeline",
            mitigation="Reviewer must reject Redis claim and accept Kafka claim with explanation in Review Workspace.",
            resolution_status="open",
            evidence_reference="Claim #22 vs Claim #31 in Claim Ledger"
        )
    ]
    for r in risks:
        db.add(r)

    # 3. Bus Factor Items
    bus_items = [
        BusFactorItem(
            id=str(uuid.uuid4()),
            project_id=project_id,
            person_name="Elena Rostova",
            role_title="Lead Telemetry Architect",
            critical_area="Kafka Distributed Event Broker & DDS Bridge",
            contributor_count=1,
            backup_owner=None,
            documentation_health="poor",
            urgency_level="critical",
            risk_impact="Total telemetry blackout and data loss if cluster enters leader election failure.",
            recommended_handoff="Pair-program Kafka cluster failover with Sam Taylor and complete Living Runbook."
        ),
        BusFactorItem(
            id=str(uuid.uuid4()),
            project_id=project_id,
            person_name="Marcus Vance",
            role_title="Security & Infrastructure Lead",
            critical_area="HashiCorp Vault HSM Keys & AWS ECR Credentials",
            contributor_count=1,
            backup_owner=None,
            documentation_health="fair",
            urgency_level="critical",
            risk_impact="Permanent lockout from AWS cloud telemetry and Docker image registry.",
            recommended_handoff="Execute Shamir secret unseal ceremony and transfer IAM admin roles to Sarah Chen."
        ),
        BusFactorItem(
            id=str(uuid.uuid4()),
            project_id=project_id,
            person_name="Alex Mercer",
            role_title="Outgoing System Lead",
            critical_area="micro-ROS STM32 Motor Odometry Loop",
            contributor_count=1,
            backup_owner="Sam Taylor",
            documentation_health="good",
            urgency_level="high",
            risk_impact="Chassis runaway, PID instability, or motor driver burn-out.",
            recommended_handoff="Validate motor bench commands and odometry test procedures in Setup Runbook."
        ),
        BusFactorItem(
            id=str(uuid.uuid4()),
            project_id=project_id,
            person_name="Priya Sharma",
            role_title="Perception Engineer",
            critical_area="Cartographer 3D SLAM & Transform Tree (`tf2`)",
            contributor_count=1,
            backup_owner=None,
            documentation_health="poor",
            urgency_level="high",
            risk_impact="Localization loss when navigating non-GPS indoor corridors.",
            recommended_handoff="Generate URDF tf2 diagram and publish sensor offset parameters."
        )
    ]
    for b in bus_items:
        db.add(b)

    # 4. Living Runbooks
    runbooks = [
        LivingRunbook(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Local Development Environment Setup",
            category="setup",
            description="Complete guide to spinning up the Project Aether simulation stack in Docker and ROS2 Humble.",
            content_markdown="""# Project Aether: Local Dev Environment Setup

### 1. Prerequisites
- Ubuntu 22.04 LTS (Jammy Jellyfish) or WSL2
- Docker 24.0+ with NVIDIA Container Toolkit (optional for GPU Gazebo)
- Python 3.14 or 3.10+
- Git LFS installed

### 2. Clone and Setup
```bash
git clone https://github.com/synthetic-robotics/project-aether.git
cd project-aether
./scripts/setup_env.sh
```

### 3. Build ROS2 Humble Workspace
```bash
docker compose up -d ros2_humble
docker exec -it aether_humble colcon build --symlink-install
source install/setup.bash
```

### 4. Verify Micro-ROS Agent
```bash
ros2 run micro_ros_agent micro_ros_agent serial --dev /dev/ttyACM0 -b 115200
```
""",
            prerequisites=["Ubuntu 22.04 LTS", "Docker 24+", "Python 3.10+", "ROS2 Humble"],
            commands=["./scripts/setup_env.sh", "docker compose up -d ros2_humble", "colcon build --symlink-install"],
            is_verified=True,
            verified_by="Sarah Chen (admin)",
            verified_at=datetime.utcnow()
        ),
        LivingRunbook(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Production Fleet Deployment Runbook",
            category="deployment",
            description="Verified step-by-step procedure for building ECR container images and deploying to robot NUC.",
            content_markdown="""# Production Fleet Deployment Runbook

### 1. Build and Tag Container
```bash
docker build -t 112233445566.dkr.ecr.us-east-1.amazonaws.com/aether-navigation:v2.1 .
```

### 2. Authenticate to AWS ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 112233445566.dkr.ecr.us-east-1.amazonaws.com
docker push 112233445566.dkr.ecr.us-east-1.amazonaws.com/aether-navigation:v2.1
```

### 3. Trigger ArgoCD Sync
```bash
argocd app sync aether-robot-fleet --prune
```

### 4. Verify Robot Daemon Health
```bash
ssh -i ~/.ssh/aether_dev_key.pub robot@192.168.1.50 'docker ps && ros2 node list'
```
""",
            prerequisites=["AWS ECR Credentials in Vault", "Fleet SSH Key", "VPN Connection to Robot LAN"],
            commands=["docker build -t aether-navigation:v2.1 .", "docker push ...", "argocd app sync aether-robot-fleet"],
            is_verified=True,
            verified_by="Elena Rostova (reviewer)",
            verified_at=datetime.utcnow()
        ),
        LivingRunbook(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="LiDAR & IMU Sensor Calibration Procedure",
            category="troubleshooting",
            description="Calibration checklist for resolving transform drift between Livox Mid-360 LiDAR and BNO055 IMU.",
            content_markdown="""# LiDAR & IMU Sensor Calibration Procedure

> [!WARNING]
> Do NOT execute on uneven flooring. Robot must be placed on level optical test bench.

### Step 1: Zero Odometry Offsets
Run the STM32 odometry reset script:
```bash
ros2 service call /reset_odometry std_srvs/srv/Empty
```

### Step 2: Record Static Calibration Bag
```bash
ros2 bag record /livox/lidar /imu/data_raw -d 120 -o calib_static_run
```

### Step 3: Compute Extrinsic Matrix
Run the Kalibr calibration suite:
```bash
ros2 run aether_calib compute_extrinsics --bag calib_static_run.db3
```
Copy resulting `T_lidar_imu` matrix to `config/transforms.yaml`.
""",
            prerequisites=["Level optical breadboard", "Reflective calibration target", "120 seconds stationary capture"],
            commands=["ros2 service call /reset_odometry std_srvs/srv/Empty", "ros2 bag record /livox/lidar /imu/data_raw -d 120"],
            is_verified=False
        ),
        LivingRunbook(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Recurring Telemetry Cluster Health Check",
            category="recurring",
            description="Weekly verification routine for Kafka brokers, disk retention quotas, and ROS2 telemetry latency.",
            content_markdown="""# Weekly Telemetry Cluster Health Check

### 1. Check Broker Partition Health
```bash
kafka-topics.sh --bootstrap-server 10.0.4.15:9092 --describe --under-replicated-partitions
```

### 2. Verify Consumer Lag
```bash
kafka-consumer-groups.sh --bootstrap-server 10.0.4.15:9092 --describe --group aether-telemetry-consumer
```
Alert threshold: Lag > 500 messages indicates cloud ingest congestion.
""",
            prerequisites=["Kafka client tools", "SSH access to telemetry gateway node"],
            commands=["kafka-topics.sh --describe", "kafka-consumer-groups.sh --describe"],
            is_verified=True,
            verified_by="Sarah Chen (admin)",
            verified_at=datetime.utcnow()
        ),
        LivingRunbook(
            id=str(uuid.uuid4()),
            project_id=project_id,
            title="Emergency Disaster Recovery & Cluster Failover",
            category="emergency",
            description="High-severity contingency plan in the event of NUC disk corruption or primary broker loss during live demo.",
            content_markdown="""# Emergency Disaster Recovery: Live Demo Failover

> [!CAUTION]
> Execute ONLY when primary Intel NUC cannot boot Ubuntu 22.04 LTS.

### 1. Hot-Swap Backup SSD
1. Power off robot chassis emergency stop switch.
2. Remove hot-swap tray 'SSD-A' from Intel NUC slot.
3. Insert clone SSD 'AETHER-BACKUP-COLD' stored in robot flight case.
4. Power on. System boots ROS1 Noetic fallback with pre-calibrated SLAM maps.

### 2. Manual Drive Override
In case of complete autonomy failure:
```bash
ros2 run teleop_twist_keyboard teleop_twist_keyboard
```
Use Bluetooth gamepad on `/dev/input/js0` for wireless safety override.
""",
            prerequisites=["Flight case cold backup SSD", "Emergency Stop button engaged", "Logitech F710 Gamepad"],
            commands=["ros2 run teleop_twist_keyboard teleop_twist_keyboard"],
            is_verified=False
        )
    ]
    for rb in runbooks:
        db.add(rb)

    # 5. Successor Guided Missions
    missions = [
        SuccessorMission(
            id=str(uuid.uuid4()),
            project_id=project_id,
            mission_number=1,
            title="Understand Project Aether Architecture",
            objective="Review the dual-tier compute model, sensor data flows, and Cartographer SLAM integration.",
            estimated_minutes=30,
            instructions_markdown="""Inspect the **Decision Archaeology** and **Knowledge Graph** to understand why the team transitioned from AMCL to Cartographer SLAM, and how the Intel NUC interfaces with the STM32 microcontroller via micro-ROS.""",
            completion_criteria=[
                "Read Decision Record: Cartographer SLAM vs AMCL",
                "Explore the Interactive Knowledge Graph nodes for Intel NUC and STM32",
                "Verify sensor coordinate frame conventions in tf2 tree"
            ],
            status="completed",
            successor_notes="Completed review. Intel NUC handles high-level Cartographer SLAM while STM32 runs motor loop via micro-ROS over UART.",
            completed_at=datetime.utcnow()
        ),
        SuccessorMission(
            id=str(uuid.uuid4()),
            project_id=project_id,
            mission_number=2,
            title="Explore Critical Project Dependencies & Blockers",
            objective="Inspect unpinned camera driver dependencies and ROS2 Humble migration state.",
            estimated_minutes=45,
            instructions_markdown="""Review the **Project Risk Radar** to identify critical blockers. Note PR #38 regarding RealSense camera drivers on Ubuntu 22.04.""",
            completion_criteria=[
                "Inspect PR #38 andlibrealsense2 compilation requirements",
                "Review the 8-category Project Risk Radar severity heatmap",
                "Check Bus-Factor Intelligence for single-person areas"
            ],
            status="in_progress",
            successor_notes="Inspecting PR #38 branch to check if librealsense2 builds cleanly in Docker."
        ),
        SuccessorMission(
            id=str(uuid.uuid4()),
            project_id=project_id,
            mission_number=3,
            title="Set Up Local Development Environment",
            objective="Clone the repository, build the Docker development container, and start micro-ROS daemon.",
            estimated_minutes=45,
            instructions_markdown="""Follow the **Living Runbook: Local Dev Environment Setup**. Ensure Docker 24+ and Python 3.14 are installed.""",
            completion_criteria=[
                "Pull base Docker image from AWS ECR",
                "Run `colcon build --symlink-install` in workspace container",
                "Confirm micro-ROS agent responds on serial port /dev/ttyACM0"
            ],
            status="pending"
        ),
        SuccessorMission(
            id=str(uuid.uuid4()),
            project_id=project_id,
            mission_number=4,
            title="Test Motor Odometry in Simulation",
            objective="Launch Gazebo simulation and send navigation goals to Cartographer SLAM.",
            estimated_minutes=60,
            instructions_markdown="""Launch the headless Gazebo world and verify that odometry topics (`/odom`, `/tf`) publish at 50Hz without packet drop.""",
            completion_criteria=[
                "Execute `ros2 launch aether_gazebo sim.launch.py`",
                "Verify `/odom` topic publishes valid quaternion coordinates",
                "Drive robot 5 meters and verify loop closure in Cartographer"
            ],
            status="pending"
        ),
        SuccessorMission(
            id=str(uuid.uuid4()),
            project_id=project_id,
            mission_number=5,
            title="Resolve the Redis vs Kafka Contradiction",
            objective="Collaborate with Reviewer Elena Rostova to deprecate Redis Streams in Review Workspace.",
            estimated_minutes=30,
            instructions_markdown="""Go to the **Review Workspace** and resolve the conflicting claim regarding Redis Streams vs Kafka. Sign off on Kafka as the official telemetry broker.""",
            completion_criteria=[
                "Discuss conflict with Elena Rostova in Collaboration Room",
                "Reject Claim #22 (Redis Streams) with documented rationale",
                "Accept Claim #31 (Kafka 3.4 Cluster) to boost Handover Readiness Score"
            ],
            status="pending"
        ),
        SuccessorMission(
            id=str(uuid.uuid4()),
            project_id=project_id,
            mission_number=6,
            title="Complete First Production Deployment",
            objective="Trigger automated ArgoCD canary deployment and verify robot telemetry stream.",
            estimated_minutes=60,
            instructions_markdown="""Follow the **Living Runbook: Fleet Deployment Runbook**. Deploy version 2.1 to test chassis and monitor telemetry dashboard.""",
            completion_criteria=[
                "Build and tag navigation image",
                "Synchronize ArgoCD pipeline",
                "Verify robot telemetry metrics in Ask Your Project assistant",
                "Submit signed Handover Receipt to Admin Sarah Chen"
            ],
            status="pending"
        )
    ]
    for m in missions:
        db.add(m)

    # 6. Collaboration Comments
    comments = [
        CollaborationComment(
            id=str(uuid.uuid4()),
            project_id=project_id,
            author_name="Elena Rostova",
            author_role="reviewer",
            comment_text="I strongly recommend deprecating the Redis Streams claim. The Kafka cluster is already provisioned on the telemetry gateway and handles the 200Hz LiDAR odometry stream without dropping packets.",
            status_tag="clarification",
            created_at=datetime.utcnow() - timedelta(days=2)
        ),
        CollaborationComment(
            id=str(uuid.uuid4()),
            project_id=project_id,
            author_name="Alex Mercer",
            author_role="leaver",
            comment_text="Agreed with Elena. Redis was just a temporary prototype during Sprint 1. Kafka is our production standard.",
            status_tag="resolved",
            created_at=datetime.utcnow() - timedelta(days=1)
        ),
        CollaborationComment(
            id=str(uuid.uuid4()),
            project_id=project_id,
            author_name="Sam Taylor",
            author_role="successor",
            comment_text="Thanks for clarifying! I've updated Mission 5 to formally accept the Kafka claim. Are the broker credentials stored in Vault?",
            status_tag="general",
            created_at=datetime.utcnow() - timedelta(hours=6)
        ),
        CollaborationComment(
            id=str(uuid.uuid4()),
            project_id=project_id,
            author_name="Marcus Vance",
            author_role="admin",
            comment_text="Yes, Sam. Secrets are in `secret/data/aether/telemetry/kafka`. Sarah and I will execute the Vault key unseal ceremony with you tomorrow.",
            status_tag="blocker",
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
    ]
    for c in comments:
        db.add(c)

    # 7. Source Reliability Scores
    sources = db.query(Source).filter(Source.project_id == project_id).all()
    for s in sources:
        if "repo" in s.filename.lower() or "readme" in s.filename.lower():
            db.add(SourceReliabilityScore(
                id=str(uuid.uuid4()),
                source_id=s.id,
                freshness_score=0.95,
                authority_score=1.0,
                completeness_score=0.92,
                corroboration_score=0.98,
                overall_score=0.96,
                contradictions_detected=0,
                rationale="Primary git repository export with verified commit history and deterministic hashes."
            ))
        elif "chat" in s.filename.lower():
            db.add(SourceReliabilityScore(
                id=str(uuid.uuid4()),
                source_id=s.id,
                freshness_score=0.98,
                authority_score=0.85,
                completeness_score=0.80,
                corroboration_score=0.88,
                overall_score=0.88,
                contradictions_detected=2,
                rationale="High freshness chat export; captures recent engineering discussions but contains informal disputes."
            ))
        else:
            db.add(SourceReliabilityScore(
                id=str(uuid.uuid4()),
                source_id=s.id,
                freshness_score=0.88,
                authority_score=0.92,
                completeness_score=0.85,
                corroboration_score=0.90,
                overall_score=0.89,
                contradictions_detected=1,
                rationale="Formal sprint documentation; authoritative for milestones and architecture decisions."
            ))

    db.commit()

