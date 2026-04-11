import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const COMMENTS_DIR = path.join(process.cwd(), 'data', 'comments')

// Like a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; commentId: string }> }
) {
  try {
    const { slug, commentId } = await params
    const commentsFile = path.join(COMMENTS_DIR, `${slug}.json`)

    if (!fs.existsSync(commentsFile)) {
      return NextResponse.json(
        { error: 'Comments not found' },
        { status: 404 }
      )
    }

    const data = JSON.parse(fs.readFileSync(commentsFile, 'utf8'))
    
    // Find and update the comment
    const updateCommentLikes = (comments: any[]): boolean => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          comment.likes += 1
          return true
        }
        if (comment.replies && comment.replies.length > 0) {
          if (updateCommentLikes(comment.replies)) {
            return true
          }
        }
      }
      return false
    }

    const updated = updateCommentLikes(data.comments)

    if (!updated) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    data.lastUpdated = new Date().toISOString()
    fs.writeFileSync(commentsFile, JSON.stringify(data, null, 2))

    return NextResponse.json({ success: true, likes: 'updated' })
  } catch (error) {
    console.error('Error liking comment:', error)
    return NextResponse.json(
      { error: 'Failed to like comment' },
      { status: 500 }
    )
  }
}
