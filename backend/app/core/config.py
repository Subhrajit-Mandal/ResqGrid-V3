from typing import Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RESQGRID_", env_file=".env", extra="ignore")
    mode: Literal["demo", "production"] = "demo"
    postgres_url: str = ""
    mongodb_uri: str = ""
    mongodb_database: str = "resqgrid_v3"
    supabase_url: str = ""
    allowed_origins: str = "http://localhost:4173,http://terminal.local:4173"
    mqtt_host: str = ""
    mqtt_port: int = 8883
    mqtt_username: str = ""
    mqtt_password: str = ""
    model_manifest: str = ""
    maximum_staleness_seconds: int = 120
    @model_validator(mode="after")
    def fail_closed(self):
        if self.mode == "production" and not all((self.postgres_url,self.mongodb_uri,self.supabase_url,self.mqtt_host)):
            raise ValueError("Production requires PostgreSQL, MongoDB, Supabase and MQTT configuration; demo fallback is forbidden")
        return self
