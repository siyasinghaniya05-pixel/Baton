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

def seed_database(db: Session, force: bool = False):
    """
    Preloads PROJECT AETHER – Robotics Club Project.
    Entirely synthetic data strictly labeled for demonstration.
    """
    existing_project = db.query(Project).filter(Project.slug == "project-aether").first()
    if existing_project and not force:
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

    return project
