from collections.abc import Iterator

from app.core.config import settings

SYSTEM_PROMPT = (
    "You are a helpful AI assistant inside this application. "
    "Give clear, accurate, concise answers. Use Markdown when it helps readability."
)


ChatPromptMessage = dict[str, str]


def stream_chat_response(messages: list[ChatPromptMessage]) -> Iterator[str]:
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    input_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    input_messages.extend(messages)

    stream = client.responses.create(
        model=settings.OPENAI_MODEL,
        input=input_messages,
        stream=True,
    )

    for event in stream:
        if event.type == "response.output_text.delta":
            yield event.delta
        elif event.type == "error":
            raise RuntimeError(getattr(event, "message", "OpenAI streaming error"))


def make_chat_title(prompt: str) -> str:
    cleaned = " ".join(prompt.split())
    if not cleaned:
        return "Untitled"
    return cleaned[:57] + "..." if len(cleaned) > 60 else cleaned
