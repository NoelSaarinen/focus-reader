# Focus Reader

Build a modern, distraction-free web application designed to help users read long texts without losing their place. The app should have a clean, minimalist UI (support for both light and dark modes) and responsive design.

Core Features & Requirements:

1. Input View: A simple, large text area where the user can paste long text, with a "Start Reading" button.

2. Reading Interface: When reading starts, hide the input area and show the reading view.

3. Two Reading Modes (toggleable via a sleek switch):

   - Mode A (Guided Highlight): Displays the full text, but dims everything except the current sentence. The highlighted sentence advances automatically based on a speed setting, or manually via spacebar/click.

   - Mode B (Focus / One-by-One): Shows only one sentence (or small chunk of words) at a time in the center of the screen. 

4. Controls Panel (sticky at the bottom or top):

   - Play/Pause button.

   - Reading Speed slider (Words Per Minute - WPM).

   - Mode toggle (Highlight vs. Focus).

   - "Back to Edit" button to return to the input view.

5. Tech Stack: Use React, Tailwind CSS, and Lucide icons for a polished look. 

Make the animations smooth (e.g., fading between sentences or highlighting transitions) to reduce eye strain.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8940e1a0-d8b7-4a91-afce-e665664f1248).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
