export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { event_type, email, name, source, payload } = req.body || {};

  if (!event_type) {
    return res.status(400).json({ error: 'event_type is required' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    let user_id = null;

    // If email provided, upsert into users table
    if (email) {
      const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({ email, name, source })
      });
      const userData = await userRes.json();
      if (Array.isArray(userData) && userData[0]) {
        user_id = userData[0].id;
      }
    }

    // Insert event
    const eventRes = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ user_id, event_type, payload: payload || {} })
    });

    if (!eventRes.ok) {
      const errText = await eventRes.text();
      console.error('Event insert failed:', errText);
      return res.status(500).json({ error: 'Failed to log event' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Tracking error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
