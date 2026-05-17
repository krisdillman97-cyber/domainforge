import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Owner access only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, session_token, device_name, command, device_id } = body;

    if (action === 'create_session') {
      // Generate a secure session token for Termux
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

      const session = await base44.asServiceRole.entities.TermuxSession.create({
        session_token: token,
        device_name: device_name || 'Termux',
        status: 'active',
        last_active: new Date().toISOString(),
        expires_at: expiresAt,
        command_log: [],
      });

      return Response.json({
        success: true,
        session_token: token,
        session_id: session.id,
        expires_at: expiresAt,
        setup_command: `# Add this to your Termux ~/.bashrc or ~/.zshrc\nexport REGISTRAR_TOKEN="${token}"\nexport REGISTRAR_URL="https://${Deno.env.get('BASE44_APP_ID')}.base44.app/functions"\n\n# Usage:\n# curl -X POST $REGISTRAR_URL/termuxBridge \\\n#   -H "Content-Type: application/json" \\\n#   -d '{"action":"ping","session_token":"'$REGISTRAR_TOKEN'"}'`,
      });
    }

    if (action === 'ping') {
      // Termux sends this to stay alive and confirm connection
      const sessions = await base44.asServiceRole.entities.TermuxSession.filter({
        session_token,
        status: 'active',
      });

      if (sessions.length === 0) {
        return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
      }

      const session = sessions[0];
      // Check expiry
      if (new Date(session.expires_at) < new Date()) {
        await base44.asServiceRole.entities.TermuxSession.update(session.id, { status: 'expired' });
        return Response.json({ error: 'Session expired' }, { status: 401 });
      }

      await base44.asServiceRole.entities.TermuxSession.update(session.id, {
        last_active: new Date().toISOString(),
        last_command: 'ping',
      });

      return Response.json({ success: true, status: 'connected', message: 'Termux bridge active' });
    }

    if (action === 'send_command_result') {
      // Termux sends back results of commands
      const sessions = await base44.asServiceRole.entities.TermuxSession.filter({
        session_token,
        status: 'active',
      });

      if (sessions.length === 0) {
        return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
      }

      const session = sessions[0];
      const log = session.command_log || [];
      log.push(`[${new Date().toISOString()}] ${command}`);
      if (log.length > 100) log.shift(); // keep last 100

      await base44.asServiceRole.entities.TermuxSession.update(session.id, {
        last_active: new Date().toISOString(),
        last_command: command?.substring(0, 200),
        command_log: log,
      });

      return Response.json({ success: true });
    }

    if (action === 'list_sessions') {
      const sessions = await base44.asServiceRole.entities.TermuxSession.list();
      // Don't expose full tokens in list
      const safe = sessions.map((s: any) => ({
        ...s,
        session_token: s.session_token?.substring(0, 8) + '...',
      }));
      return Response.json({ sessions: safe });
    }

    if (action === 'revoke_session') {
      const { session_id } = body;
      await base44.asServiceRole.entities.TermuxSession.update(session_id, { status: 'revoked' });
      return Response.json({ success: true, message: 'Session revoked' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
