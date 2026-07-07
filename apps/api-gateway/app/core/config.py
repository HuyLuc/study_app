from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "API Gateway"
    service_version: str = "0.1.0"
    environment: str = "local"
    auth_service_url: str = "http://auth-service:8000"
    learning_service_url: str = "http://learning-service:8000"
    gamification_service_url: str = "http://gamification-service:8000"
    notification_service_url: str = "http://notification-service:8000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()