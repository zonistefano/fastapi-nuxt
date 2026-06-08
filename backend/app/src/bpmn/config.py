from pydantic_settings import BaseSettings


class BPMNSettings(BaseSettings):
    pass


bpmn_settings = BPMNSettings()  # type: ignore
