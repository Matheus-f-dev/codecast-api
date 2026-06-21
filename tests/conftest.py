import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base

_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
_Session = sessionmaker(bind=_engine)


@pytest.fixture
def db():
    Base.metadata.create_all(bind=_engine)
    session = _Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_engine)
