# farm-app — original Farm Project (PHP + MySQL + Python)

This folder is a full copy of
[Claitonbatistibueno/Farm-Project](https://github.com/Claitonbatistibueno/Farm-Project),
brought into the Astro repository so that the whole product lives in one place.

## Why it lives here and is not part of the website build

| Part | Runs on | Why |
|---|---|---|
| `src/`, `public/` (Astro) | S3 + CloudFront | Static HTML/CSS/images — what the `main` pipeline deploys |
| `farm-app/` (this folder) | Not deployed by `main` | PHP and Python need a running server and a database; S3 can only serve files |

Astro only builds `src/` and `public/`, and the CDK stack only uploads `dist/`,
so nothing in this folder reaches the public site. If the PHP files were put in
`public/`, S3 would serve the **source code** as plain text instead of running it.

The public landing page (`src/pages/index.astro`) is the Astro version of `index.html`
from this folder, split into data (`src/data/farm.ts`) and markup.

## Changes made when copying (nothing was removed)

- `GEMINI_API_KEY` is now read from the environment (`os.environ`) in
  `veterinary_assistant.py`, `vet_assist_ai/veterinary_assistant.py` and
  `vet_assist_ai/data_engine.py`. Set it before running the AI scripts:
  `export GEMINI_API_KEY=...` (never commit the key).
- `farmproject.sql`: real e-mails, phone numbers and passwords in the `users`
  table (and the phone/e-mail of company 5) were replaced with placeholders.
  After importing the dump, set new passwords for the users.

`.idea/` was copied but is ignored by the repository's `.gitignore` (editor settings).

## Run the full system with Docker (login, data entry, all PHP pages)

Requirements: Docker Desktop.

```bash
cd farm-app
docker compose up --build
```

Open http://localhost:8080 and log in with **Claiton / code 123456**.

| Container | Image | What it does |
|---|---|---|
| `db` | `mariadb:10.11` | Creates the `farmproject` database and imports `farmproject.sql` on the first start (data kept in the `farm-db` volume). |
| `web` | built from `Dockerfile` (`php:8.2-apache`) | Serves `index.html` and every `.php` page; Python is installed for the AI assistant. |

The PHP and Python code reads `DB_HOST`, `DB_NAME`, `DB_USER` and `DB_PASS` from the
environment (12-Factor config). When they are not set it falls back to the XAMPP values
(`localhost`, `root`, empty password), so the project still runs on XAMPP unchanged.

To use the AI assistant, export the key before starting: `export GEMINI_API_KEY=...`.

To start again from a clean database: `docker compose down -v`.

## Next step

Push the `web` image to Amazon ECR and run it on App Runner with a managed database
(Weeks 6–7). The read-only reports are already live on the static site at `/reports`.
