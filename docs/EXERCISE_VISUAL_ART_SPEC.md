# CalisTrack Exercise Visual art specification

Exercise Visuals are identity assets, not instructional media. The canonical exercise stable key is the asset identity and filename.

## Geometry

- Canvas: square SVG with `viewBox="0 0 256 256"`.
- Safe area: keep meaningful geometry inside 16–240; aim for 20–24 units of optical padding.
- Style: one filled silhouette language built from simple paths, circles, and rounded rectangles. No anatomical, facial, clothing, shading, gradient, text, logo, or scenery detail.
- Body proportions: 32–34-unit head diameter, 18–24-unit limb thickness, simplified capsule-like joints, and a torso with comparable visual mass across poses.
- Equipment: include only identity-critical apparatus. Use the same rounded, filled geometry and visual weight as the athlete.

## Optical normalization

- Judge perceived athlete size at 48, 80, and 128 CSS pixels—not only the raw bounding box.
- Horizontal poses may span more width but must retain air above and below. Vertical poses may span more height but must retain comparable body mass.
- Equipment must remain legible at 48px without overpowering the athlete.
- Center the pose by perceived mass. Do not mechanically center long bars or floor lines.
- Review each new visual beside Push-Up, Pull-Up, Parallel Bar Dip, Hollow Body Hold, and Handstand.

## Color and surfaces

- Pilot foreground: neutral slate `#475569` with a narrow `#f8fafc` edge halo using `paint-order="stroke fill"`.
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
