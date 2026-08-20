from pydantic import BaseModel
import os

class Settings(BaseModel):
    default_symbol: str = os.getenv("YAHOO_SYMBOL", "CL=F")
    poll_seconds: int = int(os.getenv("POLL_SECONDS", "10"))
    default_timeframe: str = "5m"
    history_limit: int = 900

settings = Settings()
