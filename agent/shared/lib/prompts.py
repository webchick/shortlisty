"""Load and render prompt templates from shared/prompts/.

Prompts are Jinja2 templates so they accept structured context. Keeping them
as files (not Python strings) means:
  - Easy to diff and version-control changes
  - Non-devs can potentially edit them
  - Same prompts used identically across V1/V2/V3
"""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

_env = Environment(
    loader=FileSystemLoader(PROMPTS_DIR),
    autoescape=False,
    trim_blocks=True,
    lstrip_blocks=True,
)


def render_prompt(name: str, **context) -> str:
    template = _env.get_template(f"{name}.md")
    return template.render(**context)
