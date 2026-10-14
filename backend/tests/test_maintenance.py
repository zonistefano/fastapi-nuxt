from contextlib import nullcontext
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi_myauth.models import LoginChallenge, RefreshToken
from sqlmodel import select

from app.src.auth.models import CustomUserCreate
from app.src.auth.service import auth
from app.worker import worker


def test_scheduled_cleanup_removes_expired_records_and_preserves_live_ones(
    db, monkeypatch
):
    user = auth.crud_user.create(
        db, obj_in=CustomUserCreate(email="cleanup@example.com")
    )
    now = datetime.now(UTC)
    for expired in (True, False):
        expires_at = now + timedelta(days=-1 if expired else 1)
        db.add(
            RefreshToken(
                token_hash=("a" if expired else "b") * 64,
                authenticates_id=user.id,
                expires_at=expires_at,
            )
        )
        db.add(
            LoginChallenge(
                fingerprint=uuid4(),
                user_id=user.id,
                email=user.email,
                purpose="magic_login",
                expires_at=expires_at,
            )
        )
    db.commit()
    monkeypatch.setattr(worker, "Session", lambda _engine: nullcontext(db))
    counts = worker.prune_auth_records.run()
    assert counts == {"refreshtoken": 1, "loginchallenge": 1, "passkeyceremony": 0}
    assert db.exec(select(RefreshToken)).one().token_hash == "b" * 64
    assert len(db.exec(select(LoginChallenge)).all()) == 1
