import os
import pytest

from src.utils.env_helper import get_env_var


def test_get_env_var_prefers_first_present(monkeypatch):
	monkeypatch.delenv("A", raising=False)
	monkeypatch.delenv("B", raising=False)
	monkeypatch.setenv("B", "value_b")
	monkeypatch.setenv("A", "value_a")

	# A is present and should be returned because it's first in the list
	assert get_env_var(["A", "B"]) == "value_a"


def test_get_env_var_returns_none_when_missing_and_not_required(monkeypatch):
	monkeypatch.delenv("X", raising=False)
	monkeypatch.delenv("Y", raising=False)

	assert get_env_var(["X", "Y"]) is None


def test_get_env_var_raises_when_required_missing(monkeypatch):
	monkeypatch.delenv("X", raising=False)
	monkeypatch.delenv("Y", raising=False)

	with pytest.raises(EnvironmentError):
		get_env_var(["X", "Y"], required=True)


def test_get_env_var_min_length_validation(monkeypatch):
	monkeypatch.setenv("SHORT", "abc")

	with pytest.raises(ValueError):
		get_env_var(["SHORT"], required=True, min_length=10)


def test_get_env_var_falls_back_when_first_key_empty_or_missing(monkeypatch):
	monkeypatch.delenv("A", raising=False)
	monkeypatch.setenv("A", "")
	monkeypatch.delenv("B", raising=False)
	monkeypatch.setenv("B", "value_b")

	# "A" is present but empty, so it should be treated as not found
	# and the search should fall back to "B"
	assert get_env_var(["A", "B"]) == "value_b"