from ..service import auth

CurrentUser = auth.deps.get_current_active_user
RequireRole = auth.deps.require_role
