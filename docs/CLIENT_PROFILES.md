# Client Profiles

The client profile is split between identity, business relationship, preferences, history, and consent so one table does not become a junk drawer with legal consequences.

## Records

- `profiles`: name, phone, language, and account status.
- `client_profiles`: business relationship, Square customer mapping, favorite barber, marketing state, and grooming preferences.
- `client_preferences`: structured self-service preferences.
- `client_tags`: staff-managed operational labels.
- `client_notes`: internal or explicitly client-visible notes.
- `client_history_events`: immutable timeline entries.
- `consent_records` and `notification_preferences`: channel and purpose-specific consent.
- `client_square_mappings`: verified identity linkage to Square.
- `privacy_requests`: export and deletion requests.

## Access

Clients may read and update only their own permitted records. They cannot read internal notes, other clients, attribution, commission, or business-wide metrics. Operational staff receive business-scoped access through RLS. Sensitive administrative changes are audited.

## Duplicate prevention

A Square customer link must use verified email and, when available, verified phone. Name-only merging is prohibited. Potential duplicates use `client_merge_requests` and require an authorized review.
