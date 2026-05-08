# GitHub Pages Deployment

Live site:

https://baditaflorin.github.io/universal-document-workbench/

Pages source:

`main` branch, `/docs` directory.

Publish locally:

```sh
make build-frontend
git add docs frontend
git commit -m "chore: publish frontend"
git push
```

Rollback:

```sh
git revert HEAD
git push
```

GitHub Pages does not support `_headers` or `_redirects`. SPA fallback is handled by `docs/404.html`.

Custom domain:

1. Add a `CNAME` file in `docs/`.
2. Configure DNS with the GitHub Pages records.
3. Enable HTTPS in repository Pages settings.

