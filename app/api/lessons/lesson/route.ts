import { NextResponse, NextRequest } from "next/server";
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        const fileName = req.nextUrl.searchParams.get('pptFileName') || 'default.html';
        if (!fileName) {
            return NextResponse.json({ error: 'File name is required' }, { status: 400 });
        }

        // Ensure the file has .html extension
        const htmlFileName = fileName.endsWith('.html') ? fileName : `${fileName}.html`;
        // Update the path to point to the correct data directory
        const filePath = path.join(process.cwd(), 'app', 'api', 'lessons', 'lesson', 'data', htmlFileName);
        
        const fileContent = await readFile(filePath, 'utf-8');
        
        // Return with HTML content type
        return new NextResponse(fileContent, {
            headers: {
                'Content-Type': 'text/html'
            }
        });
    } catch (error) {
        console.error('Error reading file:', error);
        return NextResponse.json(
            { error: 'Error reading file' }, 
            { status: 500 }
        );
    }
}
