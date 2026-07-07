from pathlib import Path
import sys
from types import SimpleNamespace
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

from app.application.use_cases.learning_use_cases import LearningUseCases


def _previous_review(ease: float, interval_days: int, repetitions: int) -> SimpleNamespace:
    return SimpleNamespace(
        easiness_factor=ease,
        interval_days=interval_days,
        repetitions=repetitions,
    )


def test_first_review_sets_interval_to_one_day():
    interval, ease, repetitions = LearningUseCases._calculate_sm2(previous=None, difficulty=4)

    assert repetitions == 1
    assert interval == 1
    assert ease > 2.4


def test_second_successful_review_sets_interval_to_six_days():
    previous = _previous_review(ease=2.5, interval_days=1, repetitions=1)

    interval, ease, repetitions = LearningUseCases._calculate_sm2(previous=previous, difficulty=4)

    assert repetitions == 2
    assert interval == 6
    assert ease >= 2.5


def test_high_difficulty_resets_repetitions_and_interval():
    previous = _previous_review(ease=2.2, interval_days=8, repetitions=3)

    interval, _, repetitions = LearningUseCases._calculate_sm2(previous=previous, difficulty=2)

    assert repetitions == 0
    assert interval == 1


def test_ease_factor_never_drops_below_floor():
    previous = _previous_review(ease=1.3, interval_days=1, repetitions=1)

    _, ease, _ = LearningUseCases._calculate_sm2(previous=previous, difficulty=1)

    assert ease == 1.3


def test_easy_card_increases_interval_after_second_repetition():
    previous = _previous_review(ease=2.6, interval_days=6, repetitions=2)

    interval, _, repetitions = LearningUseCases._calculate_sm2(previous=previous, difficulty=5)

    assert repetitions == 3
    assert interval > 6
