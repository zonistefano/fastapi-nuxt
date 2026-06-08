from pydantic_settings import BaseSettings


class ChatSettings(BaseSettings):
    pass


chat_settings = ChatSettings()  # type: ignore
