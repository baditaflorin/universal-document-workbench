# Security Policy

Please report security issues privately to baditaflorin@gmail.com.

Do not open public issues for vulnerabilities, secret exposure, authentication bypasses, or parser escape bugs.

## Baseline

- No secrets belong in the frontend.
- Runtime secrets live only in server-side `.env` files.
- Upload processing runs in a Docker backend with explicit size limits.
- Local git hooks include secret scanning with `gitleaks` when installed.

