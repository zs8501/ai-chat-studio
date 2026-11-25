export const config = {
  runtime: 'nodejs',
};

function models() {
  return String(process.env.LLM_MODELS || 'deepseek-chat,deepseek-reasoner')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function GET() {
  return Response.json({
    ok: true,
    mock: !String(process.env.LLM_API_KEY || '').trim(),
    models: models(),
  });
}

export function POST() {
  return GET();
}
