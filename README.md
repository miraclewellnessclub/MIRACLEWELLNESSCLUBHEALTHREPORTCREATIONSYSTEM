# Miracle Wellness Club - Health Report Management System

A web-based health assessment and report creation system designed for **Miracle Wellness Club**. It enables health coaches and practitioners to conduct wellness evaluations, calculate body composition metrics, generate professional bilingual (Marathi & English) PDF reports, and sync records to cloud storage.

---

## 🌟 Features

- **Staff Authentication**: Secure login and OTP verification.
- **Health Metrics Calculation**:
  - Height, Weight, BMI
  - Body Fat %, Visceral Fat, Subcutaneous Fat
  - Skeletal Muscle %, Muscle Mass
  - Bone Mass, Body Water %
  - BMR (Basal Metabolic Rate), Metabolic Age
  - Ideal Weight & Fat Control Targets
- **Bilingual Health Report**: Detailed health evaluation report in Marathi & English with color-coded range indicators (Under, Normal, Over, Alert).
- **One-Click PDF Export**: Automatic high-resolution A4 PDF generation with club branding and authorized signature.
- **Local & Cloud Storage**:
  - Instant local saving using browser LocalStorage.
  - Automatic cloud PDF backup using Supabase Storage.
- **Dark / Light Mode**: Modern glassmorphic responsive UI.

---

## 📁 Project Structure

```text
├── index.html            # Main single-page application structure
├── api/
│   └── config.js         # Vercel serverless function to supply env variables securely
├── assets/
│   ├── logo.jpg          # Miracle Wellness Club brand logo
│   └── sign.png          # Authorized signature stamp
├── css/
│   └── styles.css        # Custom styles, themes, and glassmorphism design
├── js/
│   ├── app.js            # Core application logic & UI event handlers
│   ├── config.example.js # Template for Supabase configuration
│   ├── pdf.js            # PDF generation & QR/Storage upload logic
│   └── store.js          # LocalStorage CRUD operations
├── vercel.json           # Vercel deployment configuration
├── .gitignore            # Ignores sensitive keys, node_modules, and temp files
└── README.md             # Project documentation
```

---

## 🚀 Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/miraclewellnessclub/MIRACLEWELLNESSCLUBHEALTHREPORTCREATIONSYSTEM.git
   cd MIRACLEWELLNESSCLUBHEALTHREPORTCREATIONSYSTEM
   ```

2. **Configure Supabase Credentials (Optional for Cloud Sync)**:
   - Copy `js/config.example.js` to `js/config.js`:
     ```bash
     cp js/config.example.js js/config.js
     ```
   - Open `js/config.js` and enter your Supabase URL and Anon Key:
     ```javascript
     window.SUPABASE_CONFIG = {
         url: 'https://YOUR_PROJECT_ID.supabase.co',
         key: 'YOUR_SUPABASE_ANON_KEY'
     };
     ```
   *(Note: `js/config.js` is automatically ignored by `.gitignore` so your keys stay private).*

3. **Run the Application**:
   - Open `index.html` directly in any modern browser, or use a local static server like Live Server or `npx serve`.

---

## ☁️ Deploying on Vercel

1. **Push to GitHub**:
   Ensure your code is pushed to your GitHub repository.

2. **Import into Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
   - Select your GitHub repository (`MIRACLEWELLNESSCLUBHEALTHREPORTCREATIONSYSTEM`).

3. **Add Environment Variables**:
   Under **Project Settings > Environment Variables**, add:
   - `SUPABASE_URL`: Your Supabase Project URL (e.g., `https://your-project.supabase.co`)
   - `SUPABASE_ANON_KEY`: Your Supabase Anon Public Key

4. **Deploy**:
   - Click **Deploy**. Vercel will build and assign you a live production URL (e.g., `https://your-project.vercel.app`).

---

## 🔒 Security Best Practices

- No secrets, `.env` files, or private API keys are committed to Git.
- Local secrets are managed via `js/config.js` (gitignored).
- Production secrets on Vercel are served via `/api/config.js` using Vercel Environment Variables.
- Works offline/locally even without cloud storage configuration.
