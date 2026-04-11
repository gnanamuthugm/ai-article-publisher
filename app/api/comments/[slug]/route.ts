import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const COMMENTS_DIR = path.join(process.cwd(), 'data', 'comments')

interface Comment {
  id: string
  author: string
  content: string
  timestamp: string
  likes: number
  replies: Comment[]
}

interface CommentsData {
  articleSlug: string
  comments: Comment[]
  totalComments: number
  lastUpdated: string
}

// Initialize comments directory
if (!fs.existsSync(COMMENTS_DIR)) {
  fs.mkdirSync(COMMENTS_DIR, { recursive: true })
}

// Get comments for an article
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const commentsFile = path.join(COMMENTS_DIR, `${slug}.json`)

    if (!fs.existsSync(commentsFile)) {
      // Initialize comments file if it doesn't exist
      const initialData: CommentsData = {
        articleSlug: slug,
        comments: [],
        totalComments: 0,
        lastUpdated: new Date().toISOString()
      }
      fs.writeFileSync(commentsFile, JSON.stringify(initialData, null, 2))
      return NextResponse.json(initialData)
    }

    const data = JSON.parse(fs.readFileSync(commentsFile, 'utf8'))
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// Add a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { author, content } = await request.json()

    if (!author || !content) {
      return NextResponse.json(
        { error: 'Author and content are required' },
        { status: 400 }
      )
    }

    const commentsFile = path.join(COMMENTS_DIR, `${slug}.json`)
    
    let data: CommentsData
    if (fs.existsSync(commentsFile)) {
      data = JSON.parse(fs.readFileSync(commentsFile, 'utf8'))
    } else {
      data = {
        articleSlug: slug,
        comments: [],
        totalComments: 0,
        lastUpdated: new Date().toISOString()
      }
    }

    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      author: author.trim(),
      content: content.trim(),
      timestamp: new Date().toISOString(),
      likes: 0,
      replies: []
    }

    data.comments.unshift(newComment)
    data.totalComments = data.comments.length
    data.lastUpdated = new Date().toISOString()

    fs.writeFileSync(commentsFile, JSON.stringify(data, null, 2))

    return NextResponse.json(newComment)
  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    )
  }
}
