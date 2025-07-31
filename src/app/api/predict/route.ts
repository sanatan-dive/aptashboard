import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const data = searchParams.get('data');

  if (!type || !['fee', 'fraud'].includes(type)) {
    return NextResponse.json({ error: 'Invalid prediction type' }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 });
  }

  try {
    const scriptPath = path.join(process.cwd(), 'src', 'scripts', 'ai_models.py');
    // Ensure data is a valid JSON string
    const inputData = JSON.stringify(JSON.parse(data)); // Re-serialize to ensure valid JSON
    // Quote scriptPath to handle spaces in directory names
    const command = `python3 "${scriptPath}" --type ${type} --data '${inputData}'`;
    const result = execSync(command, { encoding: 'utf-8' });
    return NextResponse.json(JSON.parse(result));
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}