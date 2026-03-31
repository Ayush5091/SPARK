# Integration Notes

## NEW ENDPOINT NEEDED: Direct Activity Claim
The old 3-step flow (activity_request → approval → submission → verification) is deprecated. A new backend endpoint is required:

`POST /api/direct-claims`
Auth: student JWT
Body: 
```json
{
  "activity_id": 1,
  "proof": "https://... (URL or text)",
  "description": "...",
  "hours_spent": 5,
  "activity_date": "2024-05-10T12:00:00Z"
}
```
Response: `{ "claim_id": 123, "status": "pending", "message": "..." }`

This should:
1. Create a record in a new `direct_claims` table (or reuse `submissions` with a null `request_id` and a `direct=true` flag).
2. Notify admins for review.
3. Award points when admin approves.

Admin review endpoint:
`PUT /api/direct-claims/{id}/review`
Body: `{ "action": "approve"|"reject", "review_notes": "...", "points_awarded": 15 }`
