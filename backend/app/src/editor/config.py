from pydantic_settings import BaseSettings


class EditorSettings(BaseSettings):
    pass


editor_settings = EditorSettings()  # type: ignore
