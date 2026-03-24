import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function verifyAuth(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { error: 'No autorizado', status: 401 };

  const token = authHeader.replace('Bearer ', '');
  const supabaseAdmin = getAdminClient();
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
  
  if (userError || !user) return { error: 'Token inválido', status: 401 };

  const { data: ue } = await supabaseAdmin
    .from('usuarios_empresa')
    .select('empresa_id, rol')
    .eq('user_id', user.id)
    .single();

  if (!ue || !ue.empresa_id) return { error: 'Sin empresa asignada', status: 403 };

  return { user, empresa_id: ue.empresa_id, rol: ue.rol, supabaseAdmin };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const empresa_id = auth.empresa_id!;
    const supabaseAdmin = auth.supabaseAdmin!;

    const { data: dbUes, error: ueError } = await supabaseAdmin
      .from('usuarios_empresa')
      .select('user_id, rol')
      .eq('empresa_id', empresa_id);

    if (ueError) throw ueError;

    const empleados = [];
    for (const ue of dbUes) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ue.user_id);
      empleados.push({
        user_id: ue.user_id,
        email: authUser?.user?.email || 'Desconocido',
        rol: ue.rol
      });
    }

    // Sort: admins on top
    empleados.sort((a, b) => (a.rol === 'admin' ? -1 : 1));

    return NextResponse.json({ empleados });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const empresa_id = auth.empresa_id!;
    const supabaseAdmin = auth.supabaseAdmin!;
    const { email, password } = await req.json();

    if (!email || !password) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) throw createError;

    const { error: insertError } = await supabaseAdmin.from('usuarios_empresa').insert({
      user_id: newUser.user.id,
      empresa_id: empresa_id,
      rol: 'repartidor',
    });

    if (insertError) {
       await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
       throw insertError;
    }

    return NextResponse.json({ success: true, user_id: newUser.user.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
