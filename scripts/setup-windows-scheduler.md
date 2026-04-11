# Windows Task Scheduler Setup for CCAIP Daily Blog Generation

## Overview
This guide explains how to set up automatic daily execution of the CCAIP blog generator using Windows Task Scheduler.

## Prerequisites
- Node.js installed on your system
- GEMINI_API_KEY configured in `.env.local`
- Project files available at the specified path

## Setup Instructions

### Method 1: Using Task Scheduler GUI

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, and press Enter
   - Or search for "Task Scheduler" in Start Menu

2. **Create New Task**
   - In the right Actions pane, click "Create Task..."
   - Give your task a name: "CCAIP Daily Blog Generator"
   - Add description: "Generates daily CCAIP articles automatically"

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
   - Program/script: `node`
   - Add arguments (optional): `scripts/generate-daily-blog.js`
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
$taskName = "CCAIP Daily Blog Generator"
$scriptPath = "C:\Users\Gnanamuthu G\OneDrive\Desktop\AI-Automation\ai-article-publisher\scripts\generate-daily-blog.js"
$workingDir = "C:\Users\Gnanamuthu G\OneDrive\Desktop\AI-Automation\ai-article-publisher"
$nodePath = "node"  # Assumes node is in PATH

# Create the scheduled task action
$action = New-ScheduledTaskAction -Execute $nodePath -Argument $scriptPath -WorkingDirectory $workingDir

# Create the trigger (daily at 9:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 9am

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Register the scheduled task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Description "Generates daily CCAIP articles automatically"

# Verify the task was created
Get-ScheduledTask -TaskName $taskName
```

### Method 3: Using Command Prompt

Open Command Prompt as Administrator and run:

```cmd
schtasks /create /tn "CCAIP Daily Blog Generator" /tr "node scripts\generate-daily-blog.js" /sc daily /st 09:00 /sd %date% /ru "SYSTEM" /rp * /f
```

## Manual Testing

To test the script manually before setting up the scheduler:

```cmd
cd "C:\Users\Gnanamuthu G\OneDrive\Desktop\AI-Automation\ai-article-publisher"
npm run generate:daily
```

## Monitoring and Troubleshooting

### Check Task History
1. Open Task Scheduler
2. Find your task in the list
3. Go to the "History" tab to see execution results

### Common Issues and Solutions

1. **"Task failed to start"**
   - Ensure Node.js is in system PATH
   - Verify the script path is correct
   - Check that `.env.local` file exists with GEMINI_API_KEY

2. **"Access denied"**
   - Run Task Scheduler as Administrator
   - Ensure the account has permissions to access the project directory

3. **"Script runs but no article generated"**
   - Check the script output in Task Scheduler history
   - Verify GEMINI_API_KEY is valid
   - Ensure internet connection is available

4. **"Task doesn't run at scheduled time"**
   - Check if computer was asleep/hibernating
   - Verify trigger settings
   - Ensure "Run task as soon as possible after a scheduled start is missed" is checked

### Log File Location
The script outputs to console, which Task Scheduler captures. You can also modify the script to write to a log file if needed.

## Security Considerations

- Store API keys securely in `.env.local` file
- Set appropriate file permissions on the project directory
- Consider using a dedicated service account with minimal permissions
- Regularly rotate API keys

## Maintenance

- Check task execution weekly
- Monitor for script errors
- Update task settings if project location changes
- Review and update CCAIP topics periodically

## Alternative: Using Windows Subsystem for Linux (WSL)

If you prefer using Linux cron jobs within WSL:

```bash
# Open WSL terminal
crontab -e

# Add this line for daily execution at 9:00 AM
0 9 * * * cd /mnt/c/Users/Gnanamuthu\ G/OneDrive/Desktop/AI-Automation/ai-article-publisher && npm run generate:daily
```

## Support

For issues with:
- Task Scheduler: Contact Windows system administrator
- Script execution: Check Node.js and API key configuration
- Content generation: Review Gemini API documentation and quota
