Classify this job posting with objective tags. These tags will be used to pre-filter candidates for many different users, so be accurate and consistent rather than creative.

## Posting

Title: {{ job.title }}
Company: {{ job.company }}
Location: {{ job.location_text }}

Description:
{{ job.description }}

## Output

Return JSON with exactly this shape. No preamble, no markdown fences.

```json
{
  "category_tags": ["list", "of", "relevant", "tags"],
  "shift_pattern": "days" | "nights" | "weekends" | "rotating" | "flexible" | null,
  "employment_type": "full-time" | "part-time" | "contract" | "per-diem" | "temporary" | null,
  "remote": "yes" | "no" | "hybrid",
  "seniority": "entry" | "mid" | "senior" | "lead" | null
}
```

## Tag guidance

`category_tags` should be 3-8 lowercase hyphenated tags capturing:
- Profession (e.g., `nursing`, `software-engineering`, `teaching`)
- Specialty (e.g., `home-health`, `pediatric`, `frontend`, `developer-education`)
- Role type (e.g., `direct-care`, `management`, `individual-contributor`)
- Setting if relevant (e.g., `hospital`, `in-home`, `remote-only`, `agency`)

Examples:
- RN doing private-duty pediatric night shifts → `["nursing", "rn", "private-duty", "pediatric", "in-home", "direct-care"]`
- Senior dev advocate at a cloud company → `["software-engineering", "developer-relations", "developer-education", "senior", "individual-contributor"]`

If a field is not discernible, use `null`. Don't guess.
