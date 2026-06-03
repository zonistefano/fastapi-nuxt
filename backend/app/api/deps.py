from ..core.auth import auth

SessionDep = auth.deps.SessionDep
CurrentUser = auth.deps.get_current_active_user
ReguireRole = auth.deps.require_role
