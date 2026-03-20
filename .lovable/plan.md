

## GIF Search Picker — GIPHY Integration

### Step 0: Add GIPHY API Key Secret
Prompt you to enter your GIPHY API key as a project secret (`GIPHY_API_KEY`).

### Step 1: Edge Function — `supabase/functions/gif-search/index.ts`
- CORS headers + OPTIONS handler
- Accepts `{ token, query?, offset? }` in POST body
- Validates token via JWT check (reuse pattern from other functions)
- If `query` → calls `https://api.giphy.com/v1/gifs/search`
- If no query → calls `https://api.giphy.com/v1/gifs/trending`
- Returns `{ results: [{ id, preview, full, title }] }` using `fixed_width_small` for previews, `original` for sending
- 20 results per page, supports offset pagination

### Step 2: Register in `supabase/config.toml`
```toml
[functions.gif-search]
verify_jwt = false
```

### Step 3: New Component — `src/components/private/GifPicker.tsx`
- Panel (~300px tall) that slides up above the composer
- Search input with 300ms debounce
- Trending GIFs shown initially (no query)
- Grid of GIF thumbnails using `fixed_width_small` URLs
- Tap a GIF → calls `onSelect(fullUrl)` → closes picker
- Close via X button
- Loading and empty states

### Step 4: Update `src/components/private/MessageComposer.tsx`
- Add GIF button icon next to the existing image upload button
- Toggle opens/closes `GifPicker` above the composer
- On GIF select: call `onSend("__MEDIA__:{gif_url}")` — reuses existing media rendering
- No file upload needed (GIPHY URLs are public CDN)

### What stays unchanged
- `MessageBubble` already renders `__MEDIA__:` images
- `ImageViewer` already handles tap-to-enlarge on any image
- Database, messaging edge function, and other components untouched

