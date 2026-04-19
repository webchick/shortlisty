"""Pure-function utilities for the job pipeline. No I/O."""

import hashlib
import re


def job_content_hash(title: str, company: str | None, location: str | None) -> str:
    """Deterministic hash for dedup across sources.

    Two postings with the same (title, company, location) triple are treated
    as the same job even if they're on different boards.
    """
    normalized = f"{_normalize(title)}|{_normalize(company or '')}|{_normalize(location or '')}"
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]


def _normalize(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\w\s]", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


# Scoring thresholds — shared across V1/V2/V3 to keep email quality consistent.
SCORE_IDEAL_MIN = 80
SCORE_WORTH_A_LOOK_MIN = 60


def verdict_from_score(score: int) -> str:
    if score >= SCORE_IDEAL_MIN:
        return "ideal"
    if score >= SCORE_WORTH_A_LOOK_MIN:
        return "worth_a_look"
    return "skip"


def should_save_match(score: int) -> bool:
    return score >= SCORE_WORTH_A_LOOK_MIN
