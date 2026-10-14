"""Export the API contract without starting services or loading project secrets."""

import argparse
import base64
import json
import os
from pathlib import Path


def export_schema(output: Path) -> None:
    # Only this short-lived process uses these public, non-production settings.
    os.environ.update(
        PROJECT_NAME="FastAPI Nuxt API",
        ENABLE_DOCS="true",
        POSTGRES_SERVER="localhost",
        POSTGRES_USER="openapi",
        POSTGRES_PASSWORD="openapi",
        POSTGRES_DB="openapi",
        SQLALCHEMY_DATABASE_URI="sqlite://",
        FIRST_SUPERUSER="openapi@example.com",
        FIRST_SUPERUSER_PASSWORD="openapi-export-password",
        SECRET_KEY="openapi-export-only-not-a-production-key",
        TOTP_SECRET_KEY=base64.urlsafe_b64encode(b"o" * 32).decode(),
        RATE_LIMIT_ENABLED="false",
        BACKEND_CORS_ORIGINS="[]",
    )
    os.environ.pop("RATE_LIMIT_REDIS_URL", None)

    from app.main import app

    schema = app.openapi()
    schema["servers"] = [{"url": "http://localhost:8000"}]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    export_schema(parser.parse_args().output)
