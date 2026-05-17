import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, device_fingerprint, device_name, ip_address, user_agent, platform, notes } = body;

    // Check if user is owner (admin role)
    const isOwner = user.role === 'admin';

    if (action === 'check') {
      // Check device authorization
      const devices = await base44.asServiceRole.entities.ApprovedDevice.filter({
        device_fingerprint,
        is_active: true
      });

      const isApproved = devices.length > 0;
      const deviceInfo = devices[0] || null;

      // Update last_seen if found
      if (deviceInfo) {
        await base44.asServiceRole.entities.ApprovedDevice.update(deviceInfo.id, {
          last_seen: new Date().toISOString(),
          ip_address: ip_address || deviceInfo.ip_address,
        });
      }

      return Response.json({
        is_owner: isOwner,
        is_approved_device: isApproved,
        device: deviceInfo,
        user_email: user.email,
        can_access_owner_panel: isOwner && isApproved,
      });
    }

    if (action === 'register_device') {
      if (!isOwner) {
        return Response.json({ error: 'Only owner can register devices' }, { status: 403 });
      }

      // Check if device already exists
      const existing = await base44.asServiceRole.entities.ApprovedDevice.filter({ device_fingerprint });
      if (existing.length > 0) {
        // Reactivate if inactive
        await base44.asServiceRole.entities.ApprovedDevice.update(existing[0].id, {
          is_active: true,
          last_seen: new Date().toISOString(),
          device_name: device_name || existing[0].device_name,
          notes: notes || existing[0].notes,
        });
        return Response.json({ success: true, device: existing[0], message: 'Device reactivated' });
      }

      const device = await base44.asServiceRole.entities.ApprovedDevice.create({
        device_name: device_name || 'Unknown Device',
        device_fingerprint,
        user_agent: user_agent || '',
        ip_address: ip_address || '',
        is_owner_device: true,
        approved_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        is_active: true,
        platform: platform || 'web',
        notes: notes || '',
      });

      return Response.json({ success: true, device, message: 'Device registered successfully' });
    }

    if (action === 'revoke_device') {
      if (!isOwner) {
        return Response.json({ error: 'Only owner can revoke devices' }, { status: 403 });
      }
      const { device_id } = body;
      await base44.asServiceRole.entities.ApprovedDevice.update(device_id, { is_active: false });
      return Response.json({ success: true, message: 'Device revoked' });
    }

    if (action === 'list_devices') {
      if (!isOwner) {
        return Response.json({ error: 'Only owner can list devices' }, { status: 403 });
      }
      const devices = await base44.asServiceRole.entities.ApprovedDevice.list();
      return Response.json({ devices });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
