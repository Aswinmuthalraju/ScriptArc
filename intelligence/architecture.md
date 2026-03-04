# Intelligence Architecture

Flow:
User -> Backend -> Evaluation Engine -> Ranking -> Analytics -> UI

Response Format Example:

{
  "correct": true,
  "attempt_number": 1,
  "hint_available": false,
  "feedback": "Good logic",
  "concept_gap": null,
  "star_awarded": 5,
  "confidence_score": 92
}

Security:
- Server-side validation
- Attempt tracking
- Rate limiting
