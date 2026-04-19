Classify this volunteer opportunity listing with objective tags. These tags will be used to pre-filter candidates for many different users, so be accurate and consistent rather than creative.

## Listing

Title: {{ position.title }}
Organization: {{ position.organization }}
Location: {{ position.location_text }}

Description:
{{ position.description }}

## Output

Return JSON with exactly this shape. No preamble, no markdown fences.

```json
{
  "category_tags": ["list", "of", "relevant", "tags"],
  "cause_area": "environment" | "education" | "animals" | "health" | "social-services" | "arts" | "community" | "other" | null,
  "skills_sought": ["skill1", "skill2"],
  "time_commitment": {"hours_per_week": null, "total_duration": null},
  "remote": "yes" | "no" | "hybrid",
  "event_date": "ISO date string if one-off event, else null",
  "is_ongoing": true | false,
  "application_deadline": "ISO date string if present, else null"
}
```

## Tag guidance

`category_tags` should be 3-8 lowercase hyphenated tags capturing:
- Skill domain (e.g., `graphic-design`, `web-development`, `tutoring`, `animal-care`)
- Cause area (e.g., `environmental`, `education`, `health`)
- Role type (e.g., `hands-on`, `remote`, `event-based`, `ongoing`)

If a field is not discernible, use `null`. Don't guess.
