import { NextResponse, NextRequest } from "next/server";
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        const fileName = req.nextUrl.searchParams.get('pptFileName') || 'default.pdf';
        if (!fileName) {
            return NextResponse.json({ error: 'File name is required' }, { status: 400 });
        }

        // Ensure the file has .pdf extension
        const pdfFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        // Update the path to point to the correct data directory
        const filePath = path.join(process.cwd(), 'app', 'api', 'lessons', 'lesson', 'data', pdfFileName);
        
        // Read the PDF file as binary data
        const fileContent = await readFile(filePath);
        
        // Return with PDF content type
        return new NextResponse(fileContent, {
            headers: {
                'Content-Type': 'application/pdf'
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
