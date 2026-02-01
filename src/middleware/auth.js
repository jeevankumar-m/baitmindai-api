/**
 * API key authentication middleware.
 * Expects x-api-key header to match process.env.API_KEY.
 */
export function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  const expected = process.env.API_KEY;

  if (!expected) {
    return res.status(500).json({
      status: 'error',
      reply: 'Server misconfiguration: API_KEY not set',
    });
  }

  if (!key || key !== expected) {
    return res.status(401).json({
      status: 'error',
      reply: 'Unauthorized: invalid or missing x-api-key',
    });
  }

  next();
}
