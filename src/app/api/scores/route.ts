import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

async function getSheets() {
    const auth = new google.auth.JWT({
        email: CLIENT_EMAIL,
        key: PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return google.sheets({ version: 'v4', auth });
}

export async function GET() {
    try {
        const sheets = await getSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Scores!A:C', // Assuming a sheet named 'Scores'
        });

        const rows = response.data.values || [];
        // Map the data into an array of score objects
        const scores = rows.slice(1).map(row => ({
            name: row[0],
            score: parseInt(row[1], 10),
            timestamp: row[2],
        })).sort((a, b) => b.score - a.score);

        return NextResponse.json({ scores });
    } catch (error) {
        console.error('Error fetching scores:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { name, score } = data;

        if (!name || score === undefined) {
            return NextResponse.json({ error: 'Missing name or score' }, { status: 400 });
        }

        const sheets = await getSheets();
        const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Scores!A:C',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [[name, score, timestamp]],
            },
        });

        return NextResponse.json({ success: true, message: 'Score saved successfully' });
    } catch (error) {
        console.error('Error saving score:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
