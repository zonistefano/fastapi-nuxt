"""Regression checks for the template's bootstrap and command safety."""

import base64
import importlib.util
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("template_init", ROOT / "scripts/init.py")
assert SPEC is not None and SPEC.loader is not None
bootstrap = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bootstrap)


class BootstrapTests(unittest.TestCase):
    def test_secrets_are_persistent_and_project_specific(self):
        with tempfile.TemporaryDirectory() as directory:
            first = Path(directory) / "first.env"
            second = Path(directory) / "second.env"
            self.assertTrue(bootstrap.initialize(first))
            original = first.read_bytes()
            self.assertFalse(bootstrap.initialize(first))
            self.assertEqual(first.read_bytes(), original)
            bootstrap.initialize(second)
            one = bootstrap.read_values(first.read_text())
            two = bootstrap.read_values(second.read_text())
            for key in bootstrap.SECRET_NAMES:
                self.assertNotEqual(one[key], two[key])
                self.assertTrue(one[key])
            self.assertEqual(len(base64.urlsafe_b64decode(one["TOTP_SECRET_KEY"])), 32)
            if os.name == "posix":
                self.assertEqual(first.stat().st_mode & 0o777, 0o600)

    def test_existing_configuration_is_preserved_and_completed(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / ".env"
            destination.write_text(
                "PROJECT_NAME=Custom\nSECRET_KEY=existing-key\nTOTP_SECRET_KEY=\n"
            )
            bootstrap.initialize(destination)
            values = bootstrap.read_values(destination.read_text())
            self.assertEqual(values["PROJECT_NAME"], "Custom")
            self.assertEqual(values["SECRET_KEY"], "existing-key")
            self.assertTrue(values["TOTP_SECRET_KEY"])
            self.assertTrue(values["POSTGRES_PASSWORD"])


class CommandTests(unittest.TestCase):
    def test_make_propagates_lint_and_test_failures(self):
        for target, variable in [
            ("lint_frontend", "FRONTEND_LINT_CMD"),
            ("test_frontend", "FRONTEND_TEST_CMD"),
            ("lint_backend", "UV"),
        ]:
            with self.subTest(target=target):
                result = subprocess.run(
                    ["make", "--no-print-directory", target, f"{variable}=false"],
                    cwd=ROOT,
                    capture_output=True,
                    text=True,
                )
                self.assertNotEqual(result.returncode, 0)

    def test_test_stack_is_isolated_and_cleaned_after_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            docker = folder / "docker"
            log = folder / "commands"
            docker.write_text(
                '#!/bin/sh\nprintf "%s\\n" "$*" >> "$AUDIT_DOCKER_LOG"\n'
                'case "$*" in *"run --build"*) exit 37 ;; esac\nexit 0\n'
            )
            docker.chmod(0o755)
            result = subprocess.run(
                ["bash", str(ROOT / "scripts/test.sh")],
                cwd=folder,
                env=dict(
                    os.environ,
                    PATH=f"{folder}:{os.environ['PATH']}",
                    AUDIT_DOCKER_LOG=str(log),
                ),
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 37)
            commands = log.read_text().splitlines()
            self.assertEqual(len(commands), 2)
            for command in commands:
                self.assertIn("--project-name template-tests-", command)
                self.assertIn("docker-compose.test.yml", command)
                self.assertNotIn("docker-compose.override.yml", command)
                self.assertNotIn(str(ROOT / ".env"), command)
            self.assertIn("down --volumes --remove-orphans", commands[-1])


if __name__ == "__main__":
    unittest.main()
