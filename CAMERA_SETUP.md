# Camera Setup Guide

## Problem

Modern browsers require HTTPS for camera access. Your Next.js app is running on HTTP (localhost:3000), which prevents camera access.

## Solution

We've created a custom HTTPS server for development.

## Quick Start

1. **Stop your current development server** (if running):

   ```bash
   # Press Ctrl+C in your terminal
   ```

2. **Start the HTTPS development server**:

   ```bash
   npm run dev:https
   ```

3. **Access your app**:
   - Open: `https://localhost:3000`
   - Accept the SSL certificate warning (it's self-signed for development)
   - Camera access should now work!

## SSL Certificate Warning

When you first visit `https://localhost:3000`, your browser will show a security warning because we're using a self-signed certificate. This is normal for development.

**To proceed:**

- **Chrome/Edge**: Click "Advanced" → "Proceed to localhost (unsafe)"
- **Firefox**: Click "Advanced" → "Accept the Risk and Continue"
- **Safari**: Click "Show Details" → "visit this website" → "Visit Website"

## Troubleshooting

### Camera still not working?

1. Make sure you're on `https://localhost:3000` (not `http://`)
2. Check browser console for error messages
3. Ensure camera permissions are allowed in browser settings
4. Try refreshing the page after accepting the SSL certificate

### SSL Certificate Issues?

If you get certificate errors, regenerate them:

```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Port 3000 in use?

The HTTPS server uses port 3000. If it's already in use:

1. Stop other development servers
2. Or modify the port in `server.js`

## Development Workflow

- Use `npm run dev:https` for development with camera access
- Use `npm run dev` for regular HTTP development (no camera)
- Use `npm run build` and `npm run start` for production

## Files Created

- `server.js` - Custom HTTPS server for Next.js
- `CAMERA_SETUP.md` - This guide
- Updated `package.json` with `dev:https` script
