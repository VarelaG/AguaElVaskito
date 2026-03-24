import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPERADMIN_EMAIL = 'varelag1999@gmail.com';

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user || user.email !== SUPERADMIN_EMAIL) {
        return NextResponse.json({ error: 'Acceso denegado. Solo superadmin.' }, { status: 403 });
    }

    const { empresa_id, email, password } = await req.json();

    if (!empresa_id || !email || !password) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
    }

    // 1. Create auth user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) throw createError;

    // 2. Link user to company
    const { error: insertError } = await supabaseAdmin.from('usuarios_empresa').insert({
      user_id: userData.user.id,
      empresa_id: empresa_id,
      rol: 'repartidor',
    });

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      throw insertError;
    }

    return NextResponse.json({ success: true, user_id: userData.user.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
