# Privacy

The GitHub Pages frontend does not include analytics.

Documents are not persisted in browser storage by default. The frontend stores only the configured backend API URL in `localStorage`.

Uploaded documents are sent to the backend URL selected by the user. The backend writes uploads to temporary storage for processing and removes the temporary upload directory after each request. Operators control their own server logs and retention.

No secrets are stored in the frontend.

