# Deployment Guide - Knockoff Kitchen

⚠️ **IMPORTANT: This is a Node.js application that requires server hosting**

## ❌ Will NOT work on:
- **Netlify** (static hosting only)
- **GitHub Pages** (static hosting only)
- **Surge.sh** (static hosting only)

## ✅ Recommended Hosting Platforms:

### 1. **Vercel** (Recommended - Best for Node.js)
1. Connect your GitHub repository to Vercel
2. Set environment variable: `MONGODB_URI=your_connection_string`
3. Vercel will automatically detect Node.js and deploy
4. **Files included**: `vercel.json` (already configured)

### 2. **Railway** (Great for Node.js + MongoDB)
1. Connect your GitHub repository to Railway
2. Set environment variable: `MONGODB_URI=your_connection_string`
3. Railway will auto-deploy on every push
4. **Files included**: `railway.json` (already configured)

### 3. **Render** (Free tier available)
1. Connect your GitHub repository to Render
2. Select "Web Service"
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Set environment variable: `MONGODB_URI=your_connection_string`

### 4. **Heroku** (Classic choice)
1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Set MongoDB URI: `heroku config:set MONGODB_URI=your_connection_string`
4. Deploy: `git push heroku main`

## Environment Variables Required:

All platforms need this environment variable:
```
MONGODB_URI=mongodb+srv://bperry129:<B6r4a9d3>@cluster0.iton0z.mongodb.net/KK-NEW-Project
```

## Quick Deployment Steps:

### For Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variable
4. Deploy automatically

### For Railway:
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variable
4. Deploy automatically

## Why Netlify Doesn't Work:

Your Knockoff Kitchen requires:
- ✅ **Node.js server runtime**
- ✅ **Express.js backend**  
- ✅ **MongoDB database connections**
- ✅ **Server-side rendering (EJS templates)**
- ✅ **Dynamic route handling**

Netlify only supports:
- ❌ **Static HTML/CSS/JS files**
- ❌ **Client-side only applications**
- ❌ **No server-side processing**

## Next Steps:

1. **Choose a platform** (Vercel recommended)
2. **Connect your GitHub repository**
3. **Set the MongoDB environment variable**
4. **Deploy and test**

Your site will then be live with all the optimization features working correctly!
