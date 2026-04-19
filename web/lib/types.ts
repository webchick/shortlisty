export type Verdict = 'ideal' | 'worth_a_look' | 'skip'
export type Feedback = 'good_match' | 'bad_match' | 'applied'

export type DbUser = {
  id: string
  name: string
  email: string
  profile_summary: string | null
  location: {
    city: string
    state: string
    country: string
    radius_miles: number
    remote_ok: boolean
  }
  active: boolean
  created_at: string
  updated_at: string
}

export type UserCategory = {
  user_id: string
  category: string
  criteria: {
    ideal: string[]
    acceptable: string[]
    heck_no: string[]
  }
  notification_schedule: string
  notification_day: string | null
  notification_hour: number | null
  active: boolean
  added_at: string
}

export type PendingMatch = {
  user_id: string
  job_id: string
  score: number
  verdict: Verdict
  one_line_summary: string | null
  matched_criteria: string[]
  concerns: string[]
  scored_at: string
  notified_at: string | null
  user_feedback: Feedback | null
  feedback_note: string | null
  jobs: {
    id: string
    title: string
    company: string | null
    location_text: string | null
    url: string
    posted_at: string | null
  }
}

export type RecentMatch = {
  job_id: string
  score: number
  verdict: Verdict
  user_feedback: Feedback | null
  scored_at: string
  jobs: {
    title: string
    company: string | null
  }
}
