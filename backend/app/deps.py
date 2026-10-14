from app.src.auth.service import auth

# Share the authentication unit of work with protected application routes.
SessionDep = auth.deps.SessionDep
