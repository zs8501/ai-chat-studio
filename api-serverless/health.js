module.exports = function handler(_req, res) {
  const models = String(process.env.LLM_MODELS || 'deepseek-chat,deepseek-reasoner')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      ok: true,
      mock: !String(process.env.LLM_API_KEY || '').trim(),
      models,
    }),
  );
};
