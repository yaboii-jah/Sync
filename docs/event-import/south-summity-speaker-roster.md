# South Summity confirmed speaker roster

The owner supplied the following names, positions, LinkedIn profiles, and portraits. Assignments follow the October 7 program. The opening keynote speaker remains unconfirmed.

| Program item | Person | Organization | Profile |
| --- | --- | --- | --- |
| Talk #1 | Isaeus Guiang | AWSUG.PH | [LinkedIn](https://www.linkedin.com/in/isaeus-guiang) |
| Talk #2 | Trisha Pelagio | Amazon Web Services (AWS) | [LinkedIn](https://www.linkedin.com/in/trishapelagio) |
| Talk #3 | Kevin Ventura | Stratpoint Technologies, Inc. | [LinkedIn](https://www.linkedin.com/in/kjventura) |
| Panel | Nina Comia | Data Engineering Pilipinas | [LinkedIn](https://www.linkedin.com/in/nina-comia) |
| Panel | Jared Remulta | PROLOOK | [LinkedIn](https://www.linkedin.com/in/jared-remulta-a43a132a) |

Role descriptions and the exact event/session IDs are in [the roster source manifest](south-summity-speakers.json). The supplied portraits for Isaeus, Kevin, Nina, and Jared use `public/new-assets/speaker/`. Trisha’s `photo_url` remains null until her replacement portrait is supplied. Tracking parameters were removed from the LinkedIn profile URLs.

The initial production import and its checksums remain untouched. A distinct exact-state update changed the three talk placeholders and the single panel placeholder, then added Jared as the second panelist for the same panel. It did not change the event, sessions, keynote placeholder, unrelated records, schema, permissions, or migrations.

## Verified production update

- The baseline matched the previously imported event and five placeholders. Production website maintenance returned HTTP 503, the database was unfrozen with no maintenance guards, and both scheduled jobs were paused and drained.
- A checksum-bound transaction was rehearsed with a final `ROLLBACK`; a fresh read confirmed the original roster and inventory were unchanged.
- One-use execution committed and fresh verification passed at **2026-10-03 13:00:34 UTC / 21:00:34 Asia/Manila**. Production now has five confirmed people, the still-unconfirmed keynote placeholder, and six speaker/session links. The four confirmed portrait paths and all speaker details match this manifest.
- Candidate SQL SHA-256: `22ae57185c9572f66c49a1aebb78ed067a88fdd63135a7fdff3b361d267da1a6`.
- Both production domains remain under website maintenance; the two jobs remain paused. No app deployment, public launch, event-import replay, cleanup, migration, or notification occurred.
- Private snapshots, exact SQL, rollback evidence, the one-use attempt marker, and fresh verification are retained under `.production-maintenance/event-import/speaker-roster-20261007/`. Do not rerun the execute command; the operator refuses retries.
