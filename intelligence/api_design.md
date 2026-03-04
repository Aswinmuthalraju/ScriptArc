# Intelligence API Design

Endpoint:
POST /api/intelligence/evaluate

Request:
{
  "user_id": "123",
  "challenge_id": "array_01",
  "code": "...",
  "attempt_number": 2,
  "hint_used": false
}

Response:
{
  "correct": false,
  "feedback": "Check edge cases",
  "concept_gap": "Array boundaries",
  "star_awarded": 3
}
