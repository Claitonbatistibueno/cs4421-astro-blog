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

## Next step

This app goes live in the containerised branch (`feat/server-side-rendering`,
Weeks 5–7: Docker → ECR → App Runner).
