You are evaluating a job posting to see how well it fits a specific person.

## The person

Name: {{ user.name }}
Profile: {{ user.profile_summary }}
Location: {{ user.location.city }}, {{ user.location.state }}; within {{ user.location.radius_miles }} miles; remote OK: {{ user.location.remote_ok }}

## Their criteria

IDEAL (strong positive signal if present):
{% for c in criteria.ideal %}- {{ c }}
{% endfor %}

ACCEPTABLE (fine, don't penalize):
{% for c in criteria.acceptable %}- {{ c }}
{% endfor %}

HECK NO (immediate disqualifier):
{% for c in criteria.heck_no %}- {{ c }}
{% endfor %}

## The posting

Title: {{ job.title }}
Company: {{ job.company }}
Location: {{ job.location_text }}
Posted: {{ job.posted_at }}

Description:
{{ job.description }}

URL: {{ job.url }}

## Your task

Read the posting carefully and score it against their criteria.

Scoring rubric:
- **80-100**: Matches multiple IDEAL criteria, no concerns, clearly strong fit
- **60-79**: Matches some IDEAL, mostly ACCEPTABLE, no red flags
- **Below 60**: Don't bother surfacing
- **Any HECK NO match**: Score 0 regardless of other factors. Explain in concerns.

Important:
- Be skeptical. "Competitive pay" and "great culture" are meaningless; judge by concrete details.
- Read between the lines. "Fast-paced environment" often means understaffed. "Wear many hats" often means scope creep.
- Location: if the role requires on-site work outside their radius and isn't flagged remote, score low.
- If the description is too vague to evaluate, score 50 and flag "insufficient detail" as a concern.

## Output format

Return JSON with exactly this shape. No preamble, no markdown fences.

```json
{
  "score": 0-100,
  "verdict": "ideal" | "worth_a_look" | "skip",
  "one_line_summary": "A single sentence explaining why this fits or doesn't",
  "matched_criteria": ["specific criterion from their list that this role matches", ...],
  "concerns": ["specific concern you noticed", ...]
}
```

Use the exact verdict thresholds: ≥80 → "ideal", 60-79 → "worth_a_look", <60 → "skip".

Keep `matched_criteria` and `concerns` short and specific. Reference the criteria by phrase, not by general category.
