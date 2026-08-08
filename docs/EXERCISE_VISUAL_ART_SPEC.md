# CalisTrack Exercise Visual art specification

Exercise Visuals are identity assets, not instructional media. The canonical exercise stable key is the asset identity and filename.

## Geometry

- Canvas: square SVG with `viewBox="0 0 256 256"`.
- Safe area: keep meaningful geometry inside 16–240; aim for 20–24 units of optical padding.
- Style: human silhouette first. Build reference-driven athletes primarily with smooth Bezier paths, continuous body masses, natural bends, and tapered forms. No anatomical, facial, clothing, shading, gradient, text, logo, or scenery detail.
- Body proportions: maintain one consistent athlete model across the catalogue, with a head near one seventh to one eighth of standing height, naturally broad shoulders, a tapered waist, integrated hips, fuller thighs, and narrower wrists and ankles.
- Equipment: identity-critical apparatus may remain clean and geometric. Keep it visually secondary to the organic athlete and consistent in weight across the pack.

### Human form rules

- Head height is approximately one seventh to one eighth of standing body height. Shoulders are visibly wider than the head; the torso tapers gently toward a waist, with hips slightly narrower than the shoulders.
- Upper arms taper from shoulder to elbow, forearms taper toward wrists, thighs are fuller than calves, and calves taper toward ankles. Hands and feet are simplified organic shapes, never rectangular blocks.
- Create elbows and knees with continuous curved transitions. Do not use circular joint balls, mechanical hinges, sharp internal seams, or visibly assembled limb segments.
- Shoulders, torso, hips, and legs must visually merge into one athlete. Multiple paths are permitted internally, but their overlaps must not read as disconnected mannequin pieces.
- Do not construct people from rectangular arms or legs, box-shaped torsos, stacked trapezoids, vertical leg columns, or polygon pieces meeting at obvious corners.
- Do not use capsule-body construction or circles to represent shoulders, elbows, wrists, hips, or knees. Overlapping paths must not create false joint outlines.
- Do not sacrifice natural body flow merely to reduce path complexity or file size. The compact first read must be a minimal athletic human silhouette, never an articulated block figure.

### Reference-driven review

- Approved reference artwork is the primary pose and proportion source when supplied. Reconstruct its negative space, body taper, posture, and equipment weight rather than adapting rejected geometry.
- Use a flat single-color athlete. Keep apparatus simple, clean, geometric, and visually secondary.
- Review the full family together so head scale, shoulder width, torso mass, hips, hands, feet, and visual weight remain coherent.

## Optical normalization

- Judge perceived athlete size at 48, 80, and 128 CSS pixels—not only the raw bounding box.
- Horizontal poses may span more width but must retain air above and below. Vertical poses may span more height but must retain comparable body mass.
- Equipment must remain legible at 48px without overpowering the athlete.
- Center the pose by perceived mass. Do not mechanically center long bars or floor lines.
- Review each new visual beside Push-Up, Pull-Up, Parallel Bar Dip, Hollow Body Hold, and Handstand.

## Color and surfaces

- Pilot foreground: neutral slate `#475569` with a subtle, partially transparent `#f8fafc` edge halo using `paint-order="stroke fill"`.
- The halo preserves separation on dark surfaces while the slate body remains distinct on light surfaces.
- Artwork has no background. The shared `ExerciseVisual` component owns the theme-aware containing surface.
- Never mirror artwork automatically in RTL.

## SVG safety

Permitted primitives: `svg`, `g`, `path`, `circle`, `rect`, `line`, and `polygon` with static presentation attributes.

Prohibited: scripts, event handlers, `foreignObject`, external or data URLs, embedded raster images, external stylesheets, animation, filters, and remote resources.

## Naming and accessibility

- Filename: `{canonical-stable-key}.svg`.
- Adjacent-to-name usage is decorative (`alt=""`). Standalone usage uses the localized exercise name.
- The visual supplements the name; it never replaces the accessible exercise label or demonstration action.

## Review checklist

1. Exact canonical key and unique catalogue identity.
2. Correct 256-square viewBox and safe area.
3. Recognizable at 48px; balanced at 80px; clean at 128px.
4. Comparable perceived scale to the pilot pack.
5. Clear in light and dark surfaces and unchanged in RTL.
6. No prohibited SVG content and within the configured SVG size limit.
7. No collision with exercise title, timers, controls, or demonstration media.
