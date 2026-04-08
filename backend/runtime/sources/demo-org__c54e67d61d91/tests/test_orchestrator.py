from app.services.orchestrator import Orchestrator


def test_profile_shape() -> None:
    result = Orchestrator().profile("test-user")
    assert "recommendations" in result
    assert "balance" in result
