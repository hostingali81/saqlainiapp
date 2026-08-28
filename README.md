# Saqlaini App v2

Modern Islamic community management system with Arabic aesthetics.

## 🚀 Features

- User management with photo upload
- Payment tracking and history
- Smart payment allocation
- Google Sheets integration
- Admin panel with authentication
- Responsive design with glassmorphism UI
- Installable on mobile (web app manifest + icons; no offline service worker)

## 📋 Prerequisites

- Node.js 18+ 
- Supabase account
- Google Cloud Service Account (for Sheets API)
- Azure TTS account (optional, for audio features)

## 🛠️ Setup

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Fill in all required values:
     - Supabase credentials
     - Google Sheets API credentials
     - Azure TTS credentials (optional)
     - Sync secret token

3. **Supabase Setup**
   - Create `user-photos` bucket (Public)
   - Create folders: `small_image` and `large_image`
   - Set up authentication
   - Run database migrations (if any)

4. **Development**
   ```bash
   npm run dev
   ```

5. **Production Build**
   ```bash
   npm run build
   npm start
   ```

## 🌐 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SYNC_SECRET_TOKEN`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `AZURE_TTS_KEY` (optional)
- `AZURE_TTS_REGION` (optional)

## 📁 Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── lib/             # Utilities and helpers
└── types/           # TypeScript types
```

## 🔒 Security Notes

- Never commit `.env.local` or `.env.production`
- Keep service account credentials secure
- Use strong sync secret tokens
- Enable RLS policies in Supabase

## 📝 License

Private project
