import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const reportData = await request.json()
    
    // Sanitize filename - remove special characters and spaces
    const sanitizedName = reportData.name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .toLowerCase()
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `${sanitizedName}_${timestamp}.json`
    
    // Save to backend folder (go up from frontend to edunext root, then to backend)
    const backendPath = join(process.cwd(), '..', 'backend', 'reports')
    
    // Create reports directory if it doesn't exist
    if (!existsSync(backendPath)) {
      await mkdir(backendPath, { recursive: true })
    }
    
    const filePath = join(backendPath, filename)
    
    // Write the report data
    await writeFile(filePath, JSON.stringify(reportData, null, 2), 'utf-8')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Report saved successfully',
      filename 
    })
  } catch (error) {
    console.error('Error saving report:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save report' },
      { status: 500 }
    )
  }
}
