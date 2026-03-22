import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This route uses the SERVICE ROLE KEY (server-side only) to:
// 1. Create an auth user
// 2. Create an empresa record
// 3. Link them in usuarios_empresa

export async function POST(req: NextRequest) {
  // Lazy init: only instantiate at request time so build doesn't fail if env var missing locally
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const { nombre, email, password } = await req.json();

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: 'Faltan datos: nombre, email, password requeridos.' }, { status: 400 });
    }

    // 1. Create the auth user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
    });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    const userId = userData.user!.id;

    // 2. Create the empresa
    const { data: empresaData, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({ nombre })
      .select()
      .single();

    if (empresaError) {
      // Rollback: delete the user if empresa creation failed
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: empresaError.message }, { status: 500 });
    }

    const empresaId = empresaData.id;

    // 3. Link user to empresa
    const { error: linkError } = await supabaseAdmin
      .from('usuarios_empresa')
      .insert({ user_id: userId, empresa_id: empresaId, rol: 'admin' });

    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from('empresas').delete().eq('id', empresaId);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    // 4. Create default config for the new company
    await supabaseAdmin.from('configuracion').insert({
      id: crypto.randomUUID(),
      empresa_id: empresaId,
      precio_12l: 0,
      precio_20l: 0,
    });

    return NextResponse.json({
      success: true,
      empresa: { id: empresaId, nombre },
      user: { id: userId, email },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}
