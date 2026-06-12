import { NextResponse } from 'next/server';
import { connectDb } from '../../../../lib/db';
import AuditEntry from '../../../../models/AuditEntry';
import { compressJson, decompressJson, compactText } from '../../../../lib/auditCompression';
import { tempLog } from '../../../../lib/logging';

export const runtime = 'nodejs';

function generateAuditNumber() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let prefix = '';

  for (let i = 0; i < 3; i++) {
    prefix += letters[Math.floor(Math.random() * letters.length)];
  }

  const numbers = String(Math.floor(100 + Math.random() * 900));
  return `${prefix}${numbers}`;
}

export async function GET() {
  try {
    await connectDb();

    const rawEntries = await AuditEntry.find({})
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    const entries = rawEntries.map((entry) => ({
      ...entry,
      auditNumber: entry.auditNumber || generateAuditNumber(),
      answers: decompressJson(entry.answersCompressed, []),
      notes: decompressJson(entry.notesCompressed, ''),
      photos: (entry.photos || []).map((photo) => ({
        ...photo,
        ocrText: photo.ocrTextCompressed
          ? decompressJson(photo.ocrTextCompressed, '')
          : '',
      })),
    }));

    return NextResponse.json({ entries });
  } catch (err) {
    console.error('List audit entries error:', err);
    return NextResponse.json(
      { message: 'Could not load audit entries' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    let auditNumber = compactText(body.auditNumber || '');

    if (!auditNumber) {
      auditNumber = generateAuditNumber();
    }

    const staffName = compactText(body.staffName || 'Staff');
    const notes = compactText(body.notes || '');
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];

    const answers = rawAnswers
      .map((answer, index) => ({
        id: String(answer.id || `q-${index + 1}`),
        label: compactText(answer.label || answer.question || ''),
        value: compactText(answer.value || answer.answer || ''),
      }))
      .filter((answer) => answer.label || answer.value);

    if (answers.length === 0 && !notes) {
      return NextResponse.json(
        { message: 'Add at least one answer or note' },
        { status: 400 }
      );
    }

    await connectDb();

    const entry = await AuditEntry.create({
      auditNumber,
      staffName,
      answersCompressed: compressJson(answers),
      notesCompressed: compressJson(notes),
      answerCount: answers.length,
      source: 'manual',
      photos: [],
    });

    await tempLog({
      action: 'audit_submitted',
      userName: staffName,
      targetId: entry._id,
      targetType: 'AuditEntry',
      meta: {
        auditNumber,
        answerCount: answers.length,
      },
    });

    return NextResponse.json(
      {
        entry: {
          ...entry.toObject(),
          answers,
          notes,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create audit entry error:', err);
    return NextResponse.json(
      { message: 'Could not submit audit entry' },
      { status: 500 }
    );
  }
}