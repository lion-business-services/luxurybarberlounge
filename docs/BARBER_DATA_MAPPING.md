# Barber Data Mapping

The original card order and photograph association are preserved while replacing fictional public identities.

| Existing photo/card position | Final public identity | Final slug |
| --- | --- | --- |
| First portrait | Angelica Aquino | `angelica-aquino` |
| Second portrait | Hommy Rivera | `hommy-rivera` |
| Third portrait | Barber Lo's | `barber-los` |
| Fourth portrait | Jose | `jose` |
| Fifth portrait | Elvis | `elvis` |
| Sixth portrait | Alfredo Hernandez (Pollo) | `alfredo-hernandez-pollo` |
| Seventh portrait | Russ Hawkins | `russ-hawkins` |
| Eighth portrait | Daniel Penalo | `daniel-penalo` |

Stable internal migration logic renames legacy database rows in place before canonical upserts. This preserves historical appointment foreign keys rather than deleting and recreating profiles. The old identity labels are not emitted in public content, metadata, emails, seed data, tests, or documentation.

Confirmed online schedules are deliberately conservative. Angelica is available online on Wednesday, the only unambiguous day in the intake. Barber Lo's has no online schedule until working days are confirmed and is configured not to accept walk-ins. All other completed schedules follow the intake.
