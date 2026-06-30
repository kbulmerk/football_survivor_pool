# Hall of Fame CSVs

Each `.csv` file in this folder becomes one selectable season on the **Hall of Fame**
tab. Drop a file here, commit it to GitHub, and it shows up automatically.

## Filename → dropdown label

The filename (minus `.csv`) is turned into the dropdown label: dashes/underscores
become spaces and each word is capitalized.

- `2024-bulmer-survivor.csv` → **"2024 Bulmer Survivor"**

Files are listed newest-first by filename, so prefixing with the year keeps the
most recent season on top.

## Format

A header row followed by one row per player:

```
Name,Week 1,Week 2,Week 3,...,Week N,Winner
Brooke,Tennessee Titans,Cleveland Browns,New York Giants,...,New York Jets,X
Harry,New York Giants,Cleveland Browns,New York Jets,...,Kansas City Chiefs,
```

Rules:

- **Name** — the player's name (or whatever identifier you want shown).
- **Week N columns** — the *full* team name the player picked that week
  (e.g. `Tennessee Titans`, not `Titans`). Leave blank for weeks after the player
  was eliminated. The last filled week is treated as their elimination week.
- **Winner** — put `X` (or any non-empty value) in the winner's row. If no row is
  marked, whoever lasted the most weeks is shown as champion.
- Add as many `Week N` columns as the season ran. The table widens automatically.
- Comma-separated. Cells containing a comma should be wrapped in double quotes.
  (Tab-separated files are also accepted.)

The "Complete League" / auto-completion flow generates a CSV in exactly this format
(full team names, winner flagged). Download it from **Admin → Archive**, then commit
it here.
