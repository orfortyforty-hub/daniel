import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

async function getSheets() {
    const auth = new google.auth.JWT(
        CLIENT_EMAIL,
        undefined,
        PRIVATE_KEY,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    return google.sheets({ version: 'v4', auth });
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { attendees } = data;

        if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
            return NextResponse.json({ error: 'Missing attendees' }, { status: 400 });
        }

        const sheets = await getSheets();
        const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

        // Each attendee gets their own row: [Name, Timestamp]
        const rows = attendees.map((name: string) => [name, timestamp]);

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:B',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: rows,
            },
        });

        return NextResponse.json({ success: true, message: 'RSVP saved successfully' });
    } catch (error) {
        console.error('Error saving RSVP:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
