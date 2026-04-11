# Windows Task Scheduler Setup for Fully Automated CCAIP Daily Generator

## Overview
This guide explains how to set up automatic daily execution of the complete CCAIP article generator that includes images, real-time examples, questions, and user comments.

## Features of the Automated System
- **Complete CCAIP articles** with 1000+ words
- **Automatic image fetching** from Unsplash
- **Real-time implementation examples** with metrics
- **4 technical questions** with explanations
- **User comments system** enabled
- **Auto-publishing** to website
- **Professional formatting** with all sections

## Prerequisites
- Node.js installed on your system
- GEMINI_API_KEY configured in `.env.local`
- UNSPLASH_ACCESS_KEY (optional, for better images)
- Project files available

## Setup Instructions

### Method 1: Using Task Scheduler GUI (Recommended)

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, and press Enter
   - Or search for "Task Scheduler" in Start Menu

2. **Create New Task**
   - In the right Actions pane, click "Create Task..."
   - Give your task a name: "CCAIP Auto Daily Generator"
   - Add description: "Generates complete CCAIP articles with images, examples, questions, and comments"

3. **Configure Triggers**
   - Go to the "Triggers" tab
   - Click "New..."
   - Set "Begin the task:" to "Daily"
   - Set the start time (e.g., 9:00:00 AM)
   - Ensure "Enabled" is checked
   - Click OK

4. **Configure Actions**
   - Go to the "Actions" tab
   - Click "New..."
   - Action: "Start a program"
   - Program/script: `npm`
   - Add arguments: `run auto:ccaip`
   - Start in (optional): `C:\Users\Gnanamuthu G\OneDrive\Desktop\AI-Automation\ai-article-publisher`
   - Click OK

5. **Configure Conditions**
   - Go to the "Conditions" tab
   - Uncheck "Start the task only if the computer is on AC power" (if running on laptop)
   - Keep other settings as needed

6. **Configure Settings**
   - Go to the "Settings" tab
   - Check "Allow task to be run on demand"
   - Check "Run task as soon as possible after a scheduled start is missed"
   - Set "Stop the task if it runs longer than:" to 30 minutes
   - Check "If the running task does not end when requested, force it to stop"

7. **Save and Test**
   - Click OK to save the task
   - Right-click the task and select "Run" to test

### Method 2: Using PowerShell Commands

Open PowerShell as Administrator and run:

```powershell
# Define variables
$taskName = "CCAIP Auto Daily Generator"
$workingDir = "C:\Users\Gnanamuthu G\OneDrive\Desktop\AI-Automation\ai-article-publisher"
$npmPath = "npm"  # Assumes npm is in PATH

# Create the scheduled task action
$action = New-ScheduledTaskAction -Execute $npmPath -Argument "run auto:ccaip" -WorkingDirectory $workingDir

# Create the trigger (daily at 9:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 9am

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Register the scheduled task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Description "Generates complete CCAIP articles with images, examples, questions, and comments"

# Verify the task was created
Get-ScheduledTask -TaskName $taskName
```

### Method 3: Using Command Prompt

Open Command Prompt as Administrator and run:

```cmd
schtasks /create /tn "CCAIP Auto Daily Generator" /tr "npm run auto:ccaip" /sc daily /st 09:00 /sd %date% /ru "SYSTEM" /rp * /f
```

## Manual Testing

To test the complete automated system manually:

```cmd
cd "C:\Users\Gnanamuthu G\OneDrive\Desktop\AI-Automation\ai-article-publisher"
npm run auto:ccaip
```

## What the Automated System Generates

### Complete Article Structure:
1. **Title & Description**
2. **Real-time Implementation Example**
   - Company name
   - What they implemented
   - Measurable results
   - Implementation timeline
3. **Key Metrics & Results**
   - 5 specific metrics with numbers
   - ROI percentages
   - Performance improvements
4. **Full Article Content** (1000+ words)
   - Introduction
   - 4-6 Key Concepts
   - Implementation Strategy
   - Real-world Examples
   - Best Practices
   - Future Trends
   - Conclusion
5. **4 Technical Questions**
   - Multiple choice options
   - Correct answers
   - Detailed explanations
6. **Automatic Image**
   - Relevant CCAIP image from Unsplash
   - Proper attribution
7. **Comments System**
   - User can comment
   - Like functionality
   - Professional guidelines

### File Structure Generated:
```
content/articles/en/YYYY-MM-DD-topic-slug.md
data/comments/topic-slug.json (for user comments)
data/daily-articles.json (website index)
```

## Monitoring and Troubleshooting

### Check Task History
1. Open Task Scheduler
2. Find your task in the list
3. Go to the "History" tab to see execution results

### Expected Output:
When the task runs successfully, you should see:
```
[SUCCESS] Complete CCAIP article published:
[FILE] File: content/articles/en/2026-04-11-topic-name.md
[COMMENTS] Comments: Enabled for user interaction
[IMAGES] Images: Fetched from Unsplash
[EXAMPLES] Real-time implementation included
[QUESTIONS] 4 technical questions with explanations
[AUTO-PUBLISHED] Auto-published to website
```

### Common Issues and Solutions

1. **"Task failed to start"**
   - Ensure Node.js and npm are in system PATH
   - Verify the project path is correct
   - Check that `.env.local` file exists with API keys

2. **"No article generated"**
   - Check Gemini API key validity
   - Verify internet connection
   - Check API quota limits

3. **"No images fetched"**
   - Add UNSPLASH_ACCESS_KEY to `.env.local`
   - System will use placeholder images if no key

4. **"Comments not working"**
   - Ensure `data/comments` directory is writable
   - Check Next.js API routes are working

## Environment Variables Required

Create `.env.local` file with:
```env
GEMINI_API_KEY=your-gemini-api-key-here
UNSPLASH_ACCESS_KEY=your-unsplash-access-key-here (optional)
```

## Advanced Configuration

### Customizing Topics:
Edit `CCAIP_TOPICS` array in `scripts/auto-daily-ccaip.js`:
```javascript
const CCAIP_TOPICS = [
  "Your Custom CCAIP Topic 1",
  "Your Custom CCAIP Topic 2",
  // Add more topics...
];
```

### Changing Schedule Time:
- Modify the trigger time in Task Scheduler
- Or change the daily execution time in the task settings

### Adding More Questions:
Edit the prompt in the script to generate more questions:
```javascript
"questions": [
  // Add more question objects here
]
```

## Security Considerations

- Store API keys securely in `.env.local`
- Set appropriate file permissions
- Use dedicated service account if possible
- Regularly rotate API keys

## Maintenance

### Weekly Tasks:
- Check task execution logs
- Review generated content quality
- Monitor user comments and engagement
- Update topics quarterly

### Monthly Tasks:
- Update Gemini API key if needed
- Check Unsplash API usage
- Review and clean old comments
- Update content guidelines

## Support

For issues with:
- **Task Scheduler**: Contact Windows system administrator
- **Content Generation**: Check Gemini API documentation
- **Image Fetching**: Review Unsplash API limits
- **Comments System**: Check Next.js API routes

## Success Indicators

Your automated system is working correctly when:
- [x] One new article appears daily
- [x] Articles have proper images
- [x] Real-time examples are included
- [x] 4 questions with explanations
- [x] Users can comment on articles
- [x] Website updates automatically
- [x] No manual intervention needed

## Alternative: Using Cron Jobs (Linux/Mac)

If you prefer using cron jobs:
```bash
# Open crontab
crontab -e

# Add this line for daily execution at 9:00 AM
0 9 * * * cd /path/to/project && npm run auto:ccaip
```

Your fully automated CCAIP daily generator is now ready! It will create complete, professional articles every day without any manual intervention.
