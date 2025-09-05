# 🚀 Deployment Guide

## Prerequisites
- GitHub account with your code pushed
- Railway account (for backend)
- Vercel account (for frontend)
- Domain configured: `thebankstatementparser.com`

---

## 🔧 Step 1: Backend Deployment (Railway)

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your GitHub repository

### 1.2 Deploy Backend
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your repository
3. Choose the `backend` folder as root
4. Railway will auto-detect Dockerfile and deploy

### 1.3 Configure Environment Variables
In Railway dashboard, add these environment variables:

```bash
# Copy from backend/.env.production.template
OPENROUTER_API_KEY=your_openrouter_api_key
SUPABASE_URL=https://dvxdomditdmlqmvjnzcz.supabase.co
SUPABASE_KEY=your_supabase_key
GOOGLE_CLIENT_ID=67564734690-5q90vlmgsv4k47ttis19jhvvuql8kb5l.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
SMTP_SERVER=smtp.secureserver.net
SMTP_PORT=587
SMTP_USERNAME=support@thebankstatementparser.com
SMTP_PASSWORD=zMjs,)aGnTw9#Eb
SMTP_FROM_EMAIL=support@thebankstatementparser.com
SMTP_FROM_NAME=The Bank Statement Parser
CONTACT_TO_EMAIL=support@thebankstatementparser.com
SECRET_KEY=your_very_secure_random_secret_key_here
```

### 1.4 Custom Domain (Optional)
1. In Railway dashboard → Settings → Domains
2. Add custom domain: `api.thebankstatementparser.com`
3. Update DNS records as shown

**Your backend URL will be**: `https://your-app-name.railway.app`

---

## 🌐 Step 2: Frontend Deployment (Vercel)

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository

### 2.2 Configure Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `./` (root)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 2.3 Configure Environment Variables
In Vercel dashboard → Settings → Environment Variables:

```bash
SUPABASE_URL=https://dvxdomditdmlqmvjnzcz.supabase.co
SUPABASE_KEY=your_supabase_key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=67564734690-5q90vlmgsv4k47ttis19jhvvuql8kb5l.apps.googleusercontent.com
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_DOMAIN=thebankstatementparser.com
```

### 2.4 Custom Domain
1. In Vercel dashboard → Settings → Domains
2. Add: `thebankstatementparser.com` and `www.thebankstatementparser.com`
3. Update DNS records as shown

---

## 🔄 Step 3: Update Configuration

### 3.1 Update vercel.json
Replace `your-backend-url.railway.app` with your actual Railway URL in:
- `/vercel.json` → `env.NEXT_PUBLIC_API_URL`
- `/vercel.json` → `redirects[0].destination`

### 3.2 Test Everything
1. Visit `https://thebankstatementparser.com`
2. Test file upload and conversion
3. Test contact form
4. Test user authentication

---

## 🎯 Step 4: Automatic Deployments

### 4.1 Railway (Backend)
- ✅ Auto-deploys on push to `main` branch
- ✅ Monitors `backend/` folder changes
- ✅ Builds using Dockerfile

### 4.2 Vercel (Frontend)
- ✅ Auto-deploys on push to `main` branch  
- ✅ Monitors root folder changes
- ✅ Builds Next.js automatically

### 4.3 Your Workflow
1. Make changes locally
2. `git add . && git commit -m "your changes"`
3. `git push origin main`
4. Both Railway and Vercel auto-deploy in 2-3 minutes!

---

## 🔧 Troubleshooting

### Backend Issues
- Check Railway logs: Dashboard → Deployments → View Logs
- Verify environment variables are set
- Test health endpoint: `https://your-app.railway.app/health`

### Frontend Issues  
- Check Vercel build logs: Dashboard → Deployments
- Verify API URL in environment variables
- Test API connection in browser dev tools

### SMTP Issues
- SMTP will work in production (clean IP)
- Test with: `https://your-app.railway.app/contact/test-smtp`

---

## ✅ Final Checklist

- [ ] Backend deployed to Railway
- [ ] Environment variables configured  
- [ ] Frontend deployed to Vercel
- [ ] Custom domains configured
- [ ] HTTPS certificates active
- [ ] Contact form working
- [ ] File upload working
- [ ] Auto-deployment active

**🎉 Your app is now live at `https://thebankstatementparser.com`!**