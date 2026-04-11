# CCAIP Daily - Automated Contact Center AI Blog Platform

## Overview
CCAIP Daily is a fully automated blog publishing platform that generates and publishes daily articles exclusively about Contact Center AI (CCAIP) and Conversational AI topics. The platform uses AI to create professional technical content and automatically publishes it to a multilingual Next.js blog.

## Key Features

### 1. **Strict CCAIP-Only Content**
- **Exclusively publishes** Contact Center AI and Conversational AI articles
- **Blocked topics**: React, JavaScript, frontend development, web development, coding tutorials
- **Allowed topics**: CCAIP, Google CCAI, Dialogflow CX, IVR, Voice bots, Chatbots, Webhooks, Queue management, Agent routing, SLA, Customer support automation

### 2. **Daily Automated Generation**
- **Runs automatically** every day via Windows Task Scheduler
- **Generates exactly one** professional CCAIP article daily
- **Uses Gemini API** with model `gemini-2.5-flash`
- **Random topic selection** from 50+ CCAIP-specific topics

### 3. **Professional Content Quality**
- **800+ word articles** with technical depth
- **Professional blog style** for CCAIP professionals
- **Practical implementation** details and ROI analysis
- **Real-world examples** and best practices

### 4. **Multilingual Support**
- **English, Tamil, Hindi, Telugu** language support
- **Automatic language detection** and redirection
- **Consistent content** across all languages

### 5. **Modern UI/UX**
- **Tailwind CSS v4** styling
- **Responsive design** for all devices
- **Professional tech blog** appearance
- **Clean, focused interface**

## Architecture

### Content Generation Pipeline
```
Daily Trigger (Windows Task Scheduler)
    |
    v
Node.js Script (generate-daily-blog.js)
    |
    v
Gemini API (gemini-2.5-flash)
    |
    v
Markdown File (YYYY-MM-DD-topic-slug.md)
    |
    v
Next.js Blog UI (Automatic Display)
```

### File Structure
```
ai-article-publisher/
|
|-- scripts/
|   |-- generate-daily-blog.js          # Main generation script
|   |-- setup-windows-scheduler.md     # Scheduler setup guide
|   `-- generate-article.js            # Legacy script (deprecated)
|
|-- content/articles/
|   |-- en/                             # English articles
|   |-- ta/                             # Tamil articles  
|   |-- hi/                             # Hindi articles
|   `-- te/                             # Telugu articles
|
|-- app/
|   |-- [lang]/                         # Multilingual routing
|   |   |-- page.tsx                    # Homepage (CCAIP-focused)
|   |   `-- blog/
|   |       |-- page.tsx                # Blog listing (CCAIP-focused)
|   |       `-- [slug]/page.tsx         # Article pages
|   `-- page.tsx                        # Root redirect
|
|-- components/                         # Reusable UI components
|-- lib/                               # Utilities and helpers
`-- public/                            # Static assets
```

## Installation & Setup

### Prerequisites
- **Node.js** (v18+)
- **Gemini API Key** from Google AI Studio
- **Windows OS** (for Task Scheduler automation)

### Environment Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env.local`:
   ```env
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

### Manual Testing
Test the generation script manually:
```bash
npm run generate:daily
```

### Automated Scheduling
Set up Windows Task Scheduler using one of these methods:

#### Method 1: GUI (Recommended)
1. Open Task Scheduler (`taskschd.msc`)
2. Create new task named "CCAIP Daily Blog Generator"
3. Set daily trigger (e.g., 9:00 AM)
4. Action: `node scripts/generate-daily-blog.js`
5. Start in: project directory path

#### Method 2: PowerShell
```powershell
$action = New-ScheduledTaskAction -Execute "node" -Argument "scripts/generate-daily-blog.js" -WorkingDirectory "C:\path\to\project"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -TaskName "CCAIP Daily Blog Generator" -Action $action -Trigger $trigger
```

#### Method 3: Command Prompt
```cmd
schtasks /create /tn "CCAIP Daily Blog Generator" /tr "node scripts\generate-daily-blog.js" /sc daily /st 09:00
```

## Content Topics

### CCAIP Topic Categories
1. **Platform Architecture**
   - Google CCAI Platform
   - Multi-tenant Architecture
   - Cloud vs On-premise

2. **Conversational AI**
   - Dialogflow CX
   - Voice Bots vs Chatbots
   - Intent Recognition
   - NLP in Customer Service

3. **Contact Center Operations**
   - Queue Management
   - Agent Routing
   - SLA Monitoring
   - Escalation Strategies

4. **Technical Implementation**
   - Webhook Integration
   - API Rate Limiting
   - Real-time Transcription
   - Voice Biometrics

5. **Business & Analytics**
   - ROI Calculation
   - Performance Metrics
   - Customer Satisfaction
   - Cost Optimization

### Sample Topics
- "Dialogflow CX Queue SLA Best Practices"
- "Multi-tenant CCAIP Architecture"
- "Voice Bot Error Handling Strategies"
- "Real-time Agent Assist Implementation"
- "Customer Intent Recognition in Voice Bots"

## Development

### Running the Blog
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

### Content Generation
```bash
# Manual generation
npm run generate:daily

# View generated articles
ls content/articles/en/
```

### Customization
- **Topics**: Edit `CCAIP_TOPICS` array in `scripts/generate-daily-blog.js`
- **Prompt**: Modify the Gemini prompt in the same script
- **Styling**: Update Tailwind classes in components
- **Languages**: Add new language support in `lib/client-utils.ts`

## Monitoring & Maintenance

### Task Monitoring
1. Check Windows Task Scheduler history
2. Verify daily article generation
3. Monitor Gemini API quota usage
4. Review content quality periodically

### Troubleshooting
- **Task fails**: Check API key and network connectivity
- **No content**: Verify Gemini API quota and topic selection
- **UI not updating**: Ensure Next.js rebuild or restart

### Content Quality
- Review generated articles weekly
- Update topics quarterly
- Refine prompts based on feedback
- Monitor for content drift

## Security & Compliance

### Data Protection
- API keys stored in `.env.local` (not committed)
- No customer data in generated content
- GDPR-compliant content generation

### Access Control
- Windows Task Scheduler runs as SYSTEM
- File permissions restricted to administrators
- API access limited to generation script

## Performance

### Optimization
- **Article Generation**: ~30-60 seconds per article
- **File Size**: ~2-5 KB per markdown file
- **UI Loading**: <2 seconds initial load
- **Search**: Instant client-side filtering

### Scaling
- **Daily Articles**: 1 article/day (365 articles/year)
- **Storage**: ~1-2 MB/year for articles
- **Traffic**: Handles 1000+ concurrent users
- **API Calls**: 1 call/day to Gemini API

## Future Enhancements

### Planned Features
- [ ] Content translation to multiple languages
- [ ] Image generation for articles
- [ ] Email notifications for new articles
- [ ] Content analytics and engagement tracking
- [ ] Social media auto-posting
- [ ] Advanced content scheduling

### Technical Improvements
- [ ] Database backend for better performance
- [ ] CDN integration for global delivery
- [ ] Advanced search with AI-powered recommendations
- [ ] User authentication and personalization
- [ ] Comment system and community features

## Support

### Documentation
- [Windows Scheduler Setup](scripts/setup-windows-scheduler.md)
- [Gemini API Documentation](https://ai.google.dev/)
- [Next.js Documentation](https://nextjs.org/docs)

### Contact
For issues related to:
- **Content Generation**: Check Gemini API status and quota
- **Task Scheduler**: Review Windows system logs
- **Website Issues**: Verify Next.js build and deployment

## License

This project is proprietary and intended for internal use only.
