"""Run authentication cleanup with `python -m app.maintenance`."""

from fastapi_myauth.maintenance import prune_expired
from sqlmodel import Session

from app.core.db import engine


def main() -> None:
    with Session(engine) as session:
        counts = prune_expired(session)
    print(counts)


if __name__ == "__main__":
    main()
