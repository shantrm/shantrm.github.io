# Shant Manoukian - Personal Website

A simple, minimal personal website with clean typography and straightforward design.

## Features

- **Homepage** - Contact information and navigation
- **Projects Page** - Showcase of technical projects
- **Work Page** - Professional experience and education
- **Personal Page** - Skills, interests, and photo gallery
- **Snake Game** - Playable browser-based game with settings!

## Customization

1. **Update photos**: Put your photos in the `photos/` folder and update paths in `personal.html`

2. **Add your resume**: Place `resume.pdf` in the root directory (or update the link in `index.html`)

3. **Change the font**: Open `style.css` and find line 6:
   ```css
   font-family: 'Courier New', monospace;
   ```
   Replace `'Courier New', monospace` with any font you want:
   - `'Arial', sans-serif` - Clean, modern
   - `'Georgia', serif` - Classic, readable
   - `'Times New Roman', serif` - Traditional
   - `'Verdana', sans-serif` - Web-friendly
   - Or use Google Fonts for more options

## File Structure

```
shantrm.github.io/
├── index.html       # Homepage with contact info
├── projects.html    # Projects page
├── work.html        # Work & education page
├── personal.html    # Personal/hobbies/skills page
├── snake.html       # Snake game (playable in browser!)
├── style.css        # Styles for all pages
├── resume.pdf       # Your resume (add this)
└── photos/          # Photo gallery images (add your photos)
```

## Deploy to GitHub Pages

Since your repo is `shantrm.github.io`, just:
1. Commit all files
2. Push to GitHub
3. Site will be live at: https://shantrm.github.io

## Snake Game Features

- 6 color options for the snake
- 4 speed settings with score multipliers
- Highscore system (saved in browser)
- Game over screen with username submission
