const SUPABASE_BACKEND = process.env.SUPABASE_BACKEND_URL || 'http://173.249.36.76:8000';

module.exports = async (req, res) => {
  // Extract the path after /api/supabase/
  const fullPath = req.url || '';
  const match = fullPath.match(/^\/api\/supabase\/?(.*)$/);
  
  if (!match) {
    return res.status(400).json({ error: 'Invalid proxy path' });
  }
  
  const pathString = match[1];
  const targetUrl = `${SUPABASE_BACKEND}/${pathString}`;

  // Forward headers
  const headers = {};
  const forwardHeaders = ['apikey', 'authorization', 'content-type', 'accept', 'x-client-info'];
  for (const key of forwardHeaders) {
    const val = req.headers[key];
    if (val) headers[key] = val;
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.body) {
      // On Vercel, req.body may be parsed as object — stringify it
      // If it's already a string (raw body), use as-is
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    
    // Forward status code
    res.status(response.status);
    
    // Forward relevant response headers
    const contentType = response.headers.get('content-type') || '';
    if (contentType) res.setHeader('Content-Type', contentType);

    if (contentType.includes('application/json')) {
      const text = await response.text();
      res.send(text);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (error) {
    console.error('Supabase proxy error:', error.message);
    res.status(502).json({ error: 'Proxy connection failed', details: error.message });
  }
};
