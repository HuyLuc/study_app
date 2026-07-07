from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "Notification Service"
    service_version: str = "0.1.0"
    environment: str = "local"
    postgres_dsn: str = "postgresql://study_user:study_password@postgres:5432/study_app"
    redis_url: str = "redis://redis:6379/0"
    rabbitmq_url: str = "amqp://guest:guest@rabbitmq:5672/"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()