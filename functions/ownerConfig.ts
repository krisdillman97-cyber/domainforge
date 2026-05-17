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
    const { action, key, value, category, label, description, is_secret, configs } = body;

    if (action === 'get_all') {
      const allConfigs = await base44.asServiceRole.entities.OwnerConfig.list();
      // Mask secrets
      const safe = allConfigs.map((c: any) => ({
        ...c,
        value: c.is_secret ? '••••••••' : c.value,
      }));
      return Response.json({ configs: safe });
    }

    if (action === 'get') {
      const configs = await base44.asServiceRole.entities.OwnerConfig.filter({ key });
      if (configs.length === 0) return Response.json({ value: null });
      const c = configs[0];
      return Response.json({ value: c.is_secret ? '••••••••' : c.value, config: c });
    }

    if (action === 'set') {
      const existing = await base44.asServiceRole.entities.OwnerConfig.filter({ key });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.OwnerConfig.update(existing[0].id, {
          value,
          ...(label && { label }),
          ...(description && { description }),
          ...(category && { category }),
          ...(is_secret !== undefined && { is_secret }),
        });
        return Response.json({ success: true, message: `Config '${key}' updated` });
      } else {
        await base44.asServiceRole.entities.OwnerConfig.create({
          key, value, category: category || 'general',
          label: label || key, description: description || '',
          is_secret: is_secret || false,
        });
        return Response.json({ success: true, message: `Config '${key}' created` });
      }
    }

    if (action === 'bulk_set') {
      // configs is array of {key, value, category, label, description, is_secret}
      for (const c of configs) {
        const existing = await base44.asServiceRole.entities.OwnerConfig.filter({ key: c.key });
        if (existing.length > 0) {
          await base44.asServiceRole.entities.OwnerConfig.update(existing[0].id, { value: c.value });
        } else {
          await base44.asServiceRole.entities.OwnerConfig.create({
            key: c.key, value: c.value,
            category: c.category || 'general',
            label: c.label || c.key,
            description: c.description || '',
            is_secret: c.is_secret || false,
          });
        }
      }
      return Response.json({ success: true, message: `${configs.length} configs saved` });
    }

    if (action === 'delete') {
      const existing = await base44.asServiceRole.entities.OwnerConfig.filter({ key });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.OwnerConfig.delete(existing[0].id);
      }
      return Response.json({ success: true, message: `Config '${key}' deleted` });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
