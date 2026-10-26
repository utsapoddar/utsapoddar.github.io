# utsapoddar.github.io

Source for my personal portfolio site, served by GitHub Pages at
**[utsapoddar.github.io](https://utsapoddar.github.io)**.

Hand-written HTML, CSS, and vanilla JavaScript — no framework and no build step. Every
library and the Inter font are vendored in `vendor/`, so the page makes no third-party requests.
Pushing to the default branch deploys.

| File | Purpose |
|---|---|
| `index.html` | Page structure and content |
| `style.css` | Layout, typography and section banners |
| `app.js` | Three.js neural-network background (mouse, gyroscope and scroll reactive), smooth scroll, reveals |
| `vendor/` | three.js (MIT), GSAP and ScrollTrigger (GreenSock standard licence), Lenis (MIT), Inter (OFL) |

Motion sensors only work over https, so test the gyroscope on the deployed site.

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## License

MIT
