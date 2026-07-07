from datetime import date
from pathlib import Path
import sys
import types

SERVICE_ROOT = Path(__file__).resolve().parents[2]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.append(str(SERVICE_ROOT))

if "aio_pika" not in sys.modules:
    sys.modules["aio_pika"] = types.SimpleNamespace(
        RobustConnection=object,
        abc=types.SimpleNamespace(AbstractChannel=object, AbstractExchange=object),
        ExchangeType=types.SimpleNamespace(TOPIC="topic"),
        DeliveryMode=types.SimpleNamespace(PERSISTENT=2),
        Message=object,
        connect_robust=None,
    )

from app.application.use_cases.gamification_use_cases import GamificationUseCases


class StreakStub:
    def __init__(
        self,
        current_streak: int = 0,
        longest_streak: int = 0,
        last_activity_date: date | None = None,
        freeze_count: int = 0,
    ):
        self.current_streak = current_streak
        self.longest_streak = longest_streak
        self.last_activity_date = last_activity_date
        self.freeze_count = freeze_count


def test_same_day_activity_is_idempotent():
    streak = StreakStub(current_streak=4, longest_streak=8, last_activity_date=date(2026, 7, 6), freeze_count=1)

    GamificationUseCases._update_streak(None, streak, date(2026, 7, 6))

    assert streak.current_streak == 4
    assert streak.longest_streak == 8
    assert streak.freeze_count == 1


def test_next_day_activity_increments_streak():
    streak = StreakStub(current_streak=2, longest_streak=2, last_activity_date=date(2026, 7, 5), freeze_count=0)

    GamificationUseCases._update_streak(None, streak, date(2026, 7, 6))

    assert streak.current_streak == 3
    assert streak.longest_streak == 3
    assert streak.last_activity_date == date(2026, 7, 6)


def test_one_missed_day_uses_freeze_when_available():
    streak = StreakStub(current_streak=6, longest_streak=10, last_activity_date=date(2026, 7, 4), freeze_count=2)

    GamificationUseCases._update_streak(None, streak, date(2026, 7, 6))

    assert streak.current_streak == 7
    assert streak.freeze_count == 1
    assert streak.last_activity_date == date(2026, 7, 6)


def test_long_gap_resets_streak_to_one():
    streak = StreakStub(current_streak=9, longest_streak=12, last_activity_date=date(2026, 7, 1), freeze_count=0)

    GamificationUseCases._update_streak(None, streak, date(2026, 7, 6))

    assert streak.current_streak == 1
    assert streak.longest_streak == 12
    assert streak.last_activity_date == date(2026, 7, 6)


def test_level_thresholds_follow_formula():
    xp_for_level_2 = GamificationUseCases._cumulative_xp_for_level(2)
    xp_for_level_3 = GamificationUseCases._cumulative_xp_for_level(3)

    assert GamificationUseCases._calculate_level(0) == 1
    assert GamificationUseCases._calculate_level(xp_for_level_2 - 1) == 1
    assert GamificationUseCases._calculate_level(xp_for_level_2) == 2
    assert GamificationUseCases._calculate_level(xp_for_level_3) == 3


def test_streak_milestone_bonus_grants_only_new_thresholds():
    assert GamificationUseCases._calculate_streak_milestone_bonus(6, 7) == 50
    assert GamificationUseCases._calculate_streak_milestone_bonus(7, 29) == 0
    assert GamificationUseCases._calculate_streak_milestone_bonus(6, 31) == 250
