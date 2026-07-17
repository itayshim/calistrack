# CalisTrack

CalisTrack is a premium, mobile-first calisthenics workout tracker built with React, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, and LocalStorage. It is installable as a Progressive Web App and works offline after the first successful load.

## Local development

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

## Quality commands

```bash
npm run test
npm run lint
npm run build
```

The production output is generated in `dist/`. To inspect that exact build locally:

```bash
npm run build
npx vite preview --host 0.0.0.0
```

## Progressive Web App

The PWA configuration lives in `vite.config.ts` and uses `vite-plugin-pwa` with Workbox.

- Standalone display mode and portrait-first orientation
- 192px, 512px, maskable, and Apple touch icons
- iOS status-bar and Home Screen metadata
- Versioned application-shell/static-asset precaching
- Prompt-based update flow so a deployed update is not hidden behind an old service worker
- No API/runtime caching and no interception of LocalStorage workout data

LocalStorage remains the source of truth for user data. It is isolated by browser origin (scheme + domain + port), so localhost data does not automatically transfer to the deployed domain.

## Deploying to Vercel through GitHub

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import that existing GitHub repository.
3. Use the Vite framework preset.
4. Confirm:
   - Install command: `npm install`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy on the free Hobby plan.

`vercel.json` configures SPA fallback routing, so direct visits and refreshes on routes such as `/progress` and `/settings` resolve to the app instead of returning 404.

## Installing on iPhone

1. Open the deployed HTTPS URL in Safari.
2. Tap Safari’s **Share** button.
3. Scroll and choose **Add to Home Screen**.
4. Keep the name **CalisTrack** and tap **Add**.
5. Launch CalisTrack from the new Home Screen icon. It opens in standalone mode.

Open the deployed site once while online before relying on offline mode. When a new deployment is available, CalisTrack shows an **Update and reload** prompt.

## Data and redeployments

Workout data is stored locally on each device and deployed origin. Normal redeployments to the same Vercel production domain preserve that LocalStorage data. Changing domains, clearing Safari website data, using private browsing, or removing site storage can make the existing local data unavailable. Use JSON export for backups.

## Project structure

- `src/data` — built-in exercises and beginner program
- `src/services` — LocalStorage persistence and import/export
- `src/store` — Zustand state and application actions
- `src/utils` — statistics, records, and recommendation logic
- `src/pages` — application screens
- `src/components`, `src/layouts` — shared UI and navigation
- `public/icons` — PWA and Apple Home Screen icons

## Known limitations

- Data does not sync between devices or domains.
- iOS may suspend timers and vibration while the app is backgrounded.
- Offline support becomes available only after a successful online visit.
- The main JavaScript bundle is currently large enough to trigger a build-size warning; route-level code splitting is a future optimization.
