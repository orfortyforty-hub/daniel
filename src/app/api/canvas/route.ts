import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const CANVAS_RANGE = 'Canvas!A:E';

type CanvasAction = 'upsert' | 'delete';

type Point = { x: number; y: number };

type CanvasElement = {
    id: string;
    type: 'path' | 'text';
    points?: Point[];
    x?: number;
    y?: number;
    width?: number;
    value?: string;
    color: string;
    brushSize: number;
    brushType?: string;
    fontFamily?: string;
    textStyle?: string;
    ownerId: string;
};

async function getSheets() {
    if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
        throw new Error('Google Sheets environment variables are not configured');
    }

    const auth = new google.auth.JWT({
        email: CLIENT_EMAIL,
        key: PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return google.sheets({ version: 'v4', auth });
}

function isCanvasElement(value: unknown): value is CanvasElement {
    if (!value || typeof value !== 'object') return false;

    const element = value as Partial<CanvasElement>;

    return (
        typeof element.id === 'string' &&
        typeof element.ownerId === 'string' &&
        (element.type === 'path' || element.type === 'text') &&
        typeof element.color === 'string' &&
        typeof element.brushSize === 'number'
    );
}

function isHeaderRow(row: string[]) {
    return row[0]?.trim().toLowerCase() === 'id' && row[2]?.trim().toLowerCase() === 'action';
}

function buildCanvasState(rows: string[][]) {
    const elements = new Map<string, CanvasElement>();

    rows.forEach((row) => {
        if (!row.length || isHeaderRow(row)) return;

        const [id, ownerId, action, payloadJson] = row;

        if (!id || !ownerId || !action) return;

        if (action === 'delete') {
            elements.delete(id);
            return;
        }

        if (action !== 'upsert' || !payloadJson) return;

        try {
            const parsed = JSON.parse(payloadJson);
            if (!isCanvasElement(parsed)) return;
            if (parsed.id !== id || parsed.ownerId !== ownerId) return;
            elements.set(id, parsed);
        } catch (error) {
            console.error('Failed to parse canvas row payload:', error);
        }
    });

    return Array.from(elements.values());
}

export async function GET() {
    try {
        const sheets = await getSheets();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: CANVAS_RANGE,
        });

        const rows = response.data.values || [];
        const elements = buildCanvasState(rows);

        return NextResponse.json({ elements });
    } catch (error) {
        console.error('Error fetching canvas data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const data = await request.json();
        const { action, payload, id, ownerId } = data as {
            action?: CanvasAction;
            payload?: unknown;
            id?: string;
            ownerId?: string;
        };

        if (action !== 'upsert' && action !== 'delete') {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        let rowId = id;
        let rowOwnerId = ownerId;
        let payloadJson = '';

        if (action === 'upsert') {
            if (!isCanvasElement(payload)) {
                return NextResponse.json({ error: 'Invalid canvas payload' }, { status: 400 });
            }

            rowId = payload.id;
            rowOwnerId = payload.ownerId;
            payloadJson = JSON.stringify(payload);
        }

        if (!rowId || !rowOwnerId) {
            return NextResponse.json({ error: 'Missing id or ownerId' }, { status: 400 });
        }

        const sheets = await getSheets();
        const timestamp = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: CANVAS_RANGE,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[rowId, rowOwnerId, action, payloadJson, timestamp]],
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving canvas data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
