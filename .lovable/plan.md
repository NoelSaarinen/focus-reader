# Magnetic scroll reading mode

## Implementation
- Change the existing self-paced **Scroll** mode into a vertical sentence list inside the reading panel.
- Apply mandatory vertical scroll snapping to the list and center snapping to every sentence.
- Detect the sentence nearest the scroll container’s center after scrolling and make it the active sentence.
- Keep the active sentence crisp and fully visible while strongly dimming and subtly blurring surrounding sentences.
- Preserve automatic Highlight and Focus modes unchanged; magnetic scroll remains fully manual with autoplay and WPM controls hidden.
- Tune spacing, scroll padding, touch behavior, and motion so snapping feels smooth on desktop and mobile while respecting reduced-motion preferences.

## Verification
- Test entering Scroll mode, snapping between several sentences, active-sentence updates, and switching back to Auto.
- Check desktop and mobile layouts, including first and last sentences and light/dark themes.

## Technical details
- Use the reading panel as the scroll-snap container with `scroll-snap-type: y mandatory` and each sentence as a centered snap target.
- Derive the active index from sentence positions relative to the container center; no reading text or progress is persisted.
