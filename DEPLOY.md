# Pickleball Round Robin - Setup & Deployment Guide

## Prerequisites

You need **Node.js** installed on your computer. If you don't have it:

1. Go to https://nodejs.org
2. Download the **LTS** version (the one that says "Recommended for Most Users")
3. Run the installer - click "Next" through everything, all defaults are fine
4. Restart your terminal/command prompt after installing

Verify it works by opening a terminal and typing:
```
node --version
npm --version
```
Both should print version numbers.

---

## Step 1: Run Locally (Test on Your Computer)

Open a terminal in the project folder and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser. The app uses a local SQLite file for data, so everything works without any cloud setup.

To test the scheduling algorithm:
```bash
npm run test:scheduler
```

---

## Step 2: Deploy to Vercel (So Friends Can Access It)

### 2a. Create a Turso Database (Free)

Turso hosts your database in the cloud so data persists.

1. Go to https://turso.tech and sign up (free tier is generous - 500 databases, 9GB storage)
2. Install the Turso CLI:
   - **Windows**: Open PowerShell and run:
     ```
     irm https://get.tur.so/install.ps1 | iex
     ```
   - **Mac/Linux**:
     ```
     curl -sSfL https://get.tur.so/install.sh | bash
     ```
3. Log in:
   ```
   turso auth login
   ```
4. Create a database:
   ```
   turso db create pickleball-app
   ```
5. Get your database URL:
   ```
   turso db show pickleball-app --url
   ```
   Copy this - it looks like `libsql://pickleball-app-yourname.turso.io`

6. Create an auth token:
   ```
   turso db tokens create pickleball-app
   ```
   Copy this token.

### 2b. Push Code to GitHub

1. Go to https://github.com and create an account if you don't have one
2. Create a new repository (click the "+" in the top right, "New repository")
   - Name it `pickleball-app`
   - Keep it as Public or Private (your choice)
   - Do NOT initialize with README
   - Click "Create repository"
3. In your terminal, in the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/pickleball-app.git
   git push -u origin main
   ```

### 2c. Deploy on Vercel (Free)

1. Go to https://vercel.com and sign up with your GitHub account
2. Click "Add New Project"
3. Import your `pickleball-app` repository
4. Before clicking "Deploy", click **Environment Variables** and add:
   - `TURSO_DATABASE_URL` = the URL from step 2a.5
   - `TURSO_AUTH_TOKEN` = the token from step 2a.6
5. Click **Deploy**
6. Wait for the build to complete (usually under 2 minutes)
7. Vercel gives you a URL like `https://pickleball-app-abc123.vercel.app`

That URL works on every device - iPhones, Androids, laptops, everything!

### 2d. Custom Domain (Optional)

If you want a nicer URL like `pickleball.yourdomain.com`:
1. In Vercel, go to your project Settings > Domains
2. Add your domain and follow the DNS instructions

---

## Step 3: Share with Friends

1. Open the app on your phone
2. Create a new game
3. Tap "Share" to see the QR code and game code
4. Friends can either:
   - Scan the QR code with their phone camera
   - Go to the app URL and enter the game code
   - Click a shared link

---

## How to Use the App

### Creating a Game
1. Tap "Create New Game"
2. Enter a name (e.g., "Saturday Pickleball")
3. Select number of courts available
4. Choose mode:
   - **Rotating Partners**: Players get new partners each round (recommended)
   - **Fixed Partners**: Teams stay together
5. Tap "Create Game"

### Adding Players
1. On the Players tab, type each player's name and tap "Add"
2. Toggle players to "Out" if they're sitting out
3. You need at least 4 active players

### Generating the Schedule
1. Once all players are added, tap "Generate Schedule"
2. The app creates an optimal schedule where every player partners with every other player
3. View the full schedule on the Schedule tab

### Entering Scores
1. Go to the Scores tab
2. Tap "Enter Score" on any match
3. Enter both teams' scores and tap "Save"
4. All players see updated scores in real-time

### Viewing Rankings
1. The Rankings tab shows the leaderboard
2. Rankings update automatically as scores are entered
3. Primary sort: Win/Loss record
4. Tiebreaker: Point differential

---

## Troubleshooting

**"Game not found" when joining**
- Make sure the code is typed correctly (it's case-insensitive)
- Check that you're on the correct app URL

**Schedule doesn't look right**
- You can regenerate the schedule at any time (this resets all scores)
- Make sure the right players are marked as "Playing"

**Changes not appearing for other players**
- The app refreshes every 5 seconds automatically
- Pull down to refresh on mobile, or just wait

**App not loading on a phone**
- Make sure you're using the HTTPS URL (Vercel provides this automatically)
- Try refreshing the page
- Works best on Safari (iPhone) and Chrome (Android)

---

## Updating the App

If you make changes to the code:
1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update description"
   git push
   ```
2. Vercel automatically rebuilds and deploys within 1-2 minutes

---

## Cost

- **Vercel**: Free tier includes 100GB bandwidth/month (plenty for this app)
- **Turso**: Free tier includes 500 databases and 9GB total storage (way more than needed)
- **Total cost: $0/month** for typical use with friends
