"""Create project-local configuration without changing existing values."""

import argparse
import base64
import os
import secrets
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SECRET_NAMES = {
    "FIRST_SUPERUSER_PASSWORD",
    "SECRET_KEY",
    "TOTP_SECRET_KEY",
    "POSTGRES_PASSWORD",
    "PGADMIN_DEFAULT_PASSWORD",
    "FLOWER_PASSWORD",
    "NUXT_OG_IMAGE_SECRET",
}


def read_values(text: str) -> dict[str, str]:
    return {
        key.strip(): value.strip()
        for line in text.splitlines()
        if line.strip() and not line.lstrip().startswith("#") and "=" in line
        for key, value in [line.split("=", 1)]
    }


def initialize(destination: Path) -> bool:
    template = (PROJECT_ROOT / ".env.example").read_text()
    exists = destination.exists()
    original = destination.read_text() if exists else template
    values = read_values(original)
    lines = original.splitlines()
    changed = not exists
    for name, default in read_values(template).items():
        if name in values and (name not in SECRET_NAMES or values[name].strip("\"'")):
            continue
        value = default
        if name in SECRET_NAMES:
            value = (
                base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
                if name == "TOTP_SECRET_KEY"
                else secrets.token_urlsafe(48)
            )
        replacement = f"{name}={value}"
        if name in values:
            lines = [
                replacement if line.partition("=")[0].strip() == name else line
                for line in lines
            ]
        else:
            lines.append(replacement)
        changed = True
    if changed:
        destination.parent.mkdir(parents=True, exist_ok=True)
        # An atomic replacement avoids exposing partially generated credentials.
        with tempfile.NamedTemporaryFile(
            mode="w", dir=destination.parent, delete=False
        ) as output:
            temporary = Path(output.name)
            output.write("\n".join(lines) + "\n")
        try:
            os.chmod(temporary, 0o600)
            temporary.replace(destination)
        finally:
            temporary.unlink(missing_ok=True)
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=PROJECT_ROOT / ".env")
    args = parser.parse_args()
    changed = initialize(args.env_file)
    print(
        f"Configuration {'initialized' if changed else 'already complete'}: {args.env_file}"
    )


if __name__ == "__main__":
    main()
