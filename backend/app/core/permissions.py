from typing import List
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.models.project import SensitivityLevel, ProjectMember

# Role hierarchy for sensitivity clearance
# RESTRICTED_VIEWER: PUBLIC only
# SUCCESSOR: PUBLIC, INTERNAL
# LEAVER: PUBLIC, INTERNAL, CONFIDENTIAL (for handover generation)
# REVIEWER: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED (with authorization)
# ADMIN: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED

SENSITIVITY_HIERARCHY = {
    SensitivityLevel.PUBLIC: 1,
    SensitivityLevel.INTERNAL: 2,
    SensitivityLevel.CONFIDENTIAL: 3,
    SensitivityLevel.RESTRICTED: 4,
}

ROLE_DEFAULT_MAX_SENSITIVITY = {
    UserRole.RESTRICTED_VIEWER: SensitivityLevel.PUBLIC,
    UserRole.SUCCESSOR: SensitivityLevel.INTERNAL,
    UserRole.LEAVER: SensitivityLevel.CONFIDENTIAL,
    UserRole.REVIEWER: SensitivityLevel.RESTRICTED,
    UserRole.ADMIN: SensitivityLevel.RESTRICTED,
}

def can_access_sensitivity(user_role: UserRole, item_sensitivity: SensitivityLevel, member_max_override: SensitivityLevel = None) -> bool:
    effective_max = member_max_override or ROLE_DEFAULT_MAX_SENSITIVITY.get(user_role, SensitivityLevel.PUBLIC)
    return SENSITIVITY_HIERARCHY.get(item_sensitivity, 99) <= SENSITIVITY_HIERARCHY.get(effective_max, 1)

def require_roles(allowed_roles: List[UserRole]):
    def role_checker(current_user: User):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action forbidden for role: {current_user.role.value}"
            )
        return current_user
    return role_checker

def inherit_most_restrictive_sensitivity(sensitivities: List[SensitivityLevel]) -> SensitivityLevel:
    """
    Core rule: A claim inherits the most restrictive sensitivity label of all its supporting evidence.
    """
    if not sensitivities:
        return SensitivityLevel.INTERNAL
    max_rank = 1
    selected = SensitivityLevel.PUBLIC
    for s in sensitivities:
        rank = SENSITIVITY_HIERARCHY.get(s, 1)
        if rank > max_rank:
            max_rank = rank
            selected = s
    return selected

