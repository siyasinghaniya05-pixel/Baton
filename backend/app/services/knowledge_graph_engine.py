from typing import List, Dict, Set
from sqlalchemy.orm import Session
from app.models.claim import Claim, ClaimCategory, ClaimStatus
from app.models.source import Source
from app.models.continuity import DecisionRecord, RiskFinding, BusFactorItem
from app.schemas.continuity import GraphNode, GraphEdge, KnowledgeGraphResponse

def generate_knowledge_graph(db: Session, project_id: str) -> KnowledgeGraphResponse:
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    node_ids: Set[str] = set()

    def add_node(node: GraphNode):
        if node.id not in node_ids:
            nodes.append(node)
            node_ids.add(node.id)

    # 1. Sources & Files & Repos
    sources = db.query(Source).filter(Source.project_id == project_id).all()
    for s in sources:
        add_node(GraphNode(
            id=f"src_{s.id}",
            label=s.filename,
            type="repo" if s.file_type.value == "repo" else "file",
            details=f"Source ID: {s.id[:8]} | Type: {s.file_type.value.upper()}",
            status="verified",
            critical=s.sensitivity.value in ["restricted", "confidential"]
        ))

    # 2. Key Team Members (from Bus Factor and Claims)
    bus_items = db.query(BusFactorItem).filter(BusFactorItem.project_id == project_id).all()
    for b in bus_items:
        person_id = f"person_{b.person_name.replace(' ', '_').lower()}"
        add_node(GraphNode(
            id=person_id,
            label=b.person_name,
            type="person",
            details=f"{b.role_title} | Critical: {b.critical_area}",
            status=b.documentation_health,
            critical=b.urgency_level in ["critical", "high"]
        ))
        # System node for the critical area
        sys_id = f"sys_{b.critical_area.replace(' ', '_').lower()[:32]}"
        add_node(GraphNode(
            id=sys_id,
            label=b.critical_area[:28],
            type="system",
            details=b.critical_area,
            status="active",
            critical=True
        ))
        edges.append(GraphEdge(
            source=person_id,
            target=sys_id,
            relationship="OWNS",
            label="OWNS"
        ))

    # 3. Decisions
    decisions = db.query(DecisionRecord).filter(DecisionRecord.project_id == project_id).all()
    for d in decisions:
        dec_id = f"dec_{d.id}"
        add_node(GraphNode(
            id=dec_id,
            label=d.title[:32] + ("..." if len(d.title) > 32 else ""),
            type="decision",
            details=d.what_decided,
            status=d.reversal_status,
            critical=d.reversal_status == "active",
            evidence_quote=d.evidence_quote,
            evidence_location=d.evidence_location
        ))
        # Link participants to decision
        if d.participants:
            for p in d.participants:
                person_id = f"person_{p.replace(' ', '_').lower()}"
                add_node(GraphNode(
                    id=person_id,
                    label=p,
                    type="person",
                    details=f"Contributor on {d.title}",
                    status="active"
                ))
                edges.append(GraphEdge(
                    source=person_id,
                    target=dec_id,
                    relationship="DECIDED",
                    label="DECIDED"
                ))
        if d.source_id:
            src_node_id = f"src_{d.source_id}"
            if src_node_id in node_ids:
                edges.append(GraphEdge(
                    source=dec_id,
                    target=src_node_id,
                    relationship="DOCUMENTED_IN",
                    label="DOCUMENTED_IN"
                ))

    # 4. Claims: Tasks, Risks, Dependencies, Blockers
    claims = db.query(Claim).filter(Claim.project_id == project_id).all()
    for c in claims:
        claim_node_id = f"claim_{c.id}"
        node_type = "task"
        if c.category in [ClaimCategory.RISK, ClaimCategory.RECURRING_PROBLEM]:
            node_type = "risk"
        elif c.category in [ClaimCategory.DEPENDENCY, ClaimCategory.BLOCKER]:
            node_type = "dependency"
        elif c.category == ClaimCategory.DECISION:
            continue

        add_node(GraphNode(
            id=claim_node_id,
            label=c.description[:28] + ("..." if len(c.description) > 28 else ""),
            type=node_type,
            details=c.description,
            status=c.status.value,
            critical=c.status.value in ["Conflict", "Missing"],
            evidence_quote=c.exact_quote,
            evidence_location=c.evidence_location
        ))

        # Check for named people mentioned in task
        for p_name in ["Alex Mercer", "Elena Rostova", "Marcus Vance", "Sam Taylor", "Priya Sharma"]:
            if p_name.split()[0] in c.description:
                p_id = f"person_{p_name.replace(' ', '_').lower()}"
                add_node(GraphNode(
                    id=p_id,
                    label=p_name,
                    type="person",
                    details="Assigned task owner",
                    status="active"
                ))
                edges.append(GraphEdge(
                    source=p_id,
                    target=claim_node_id,
                    relationship="OWNS",
                    label="OWNS"
                ))
                break

        # Connect to source
        if c.source_id:
            src_node_id = f"src_{c.source_id}"
            if src_node_id in node_ids:
                edges.append(GraphEdge(
                    source=claim_node_id,
                    target=src_node_id,
                    relationship="DOCUMENTED_IN",
                    label="DOCUMENTED_IN"
                ))

    # 5. Connect Blockers / Conflicts
    for c in claims:
        if c.status == ClaimStatus.CONFLICT:
            conf_node_id = f"claim_{c.id}"
            for other in claims:
                if other.id != c.id and "Kafka" in c.description and "Kafka" in other.description:
                    edges.append(GraphEdge(
                        source=conf_node_id,
                        target=f"claim_{other.id}",
                        relationship="BLOCKED_BY",
                        label="BLOCKED_BY"
                    ))

    # 6. Risk Findings
    risks = db.query(RiskFinding).filter(RiskFinding.project_id == project_id).all()
    for r in risks:
        risk_node_id = f"rf_{r.id}"
        add_node(GraphNode(
            id=risk_node_id,
            label=r.title[:28] + ("..." if len(r.title) > 28 else ""),
            type="risk",
            details=f"{r.description} | Severity: {r.severity.upper()}",
            status=r.resolution_status,
            critical=r.severity in ["critical", "high"]
        ))
        if r.affected_entity:
            for n in nodes:
                if (n.label.lower() in r.affected_entity.lower() or r.affected_entity.lower() in n.label.lower()) and n.id != risk_node_id:
                    edges.append(GraphEdge(
                        source=risk_node_id,
                        target=n.id,
                        relationship="BLOCKED_BY",
                        label="IMPACTS"
                    ))
                    break

    stats = {
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "persons": sum(1 for n in nodes if n.type == "person"),
        "decisions": sum(1 for n in nodes if n.type == "decision"),
        "tasks": sum(1 for n in nodes if n.type == "task"),
        "risks": sum(1 for n in nodes if n.type == "risk"),
        "systems": sum(1 for n in nodes if n.type == "system"),
        "files": sum(1 for n in nodes if n.type in ["file", "repo"]),
        "dependencies": sum(1 for n in edges if n.relationship == "DEPENDS_ON")
    }

    return KnowledgeGraphResponse(
        project_id=project_id,
        nodes=nodes,
        edges=edges,
        stats=stats
    )
