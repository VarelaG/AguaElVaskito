import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user || user.email !== 'varelag1999@gmail.com') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  // 1. Fetch all companies
  const { data: empresasData, error } = await supabaseAdmin
    .from('empresas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // 2. Fetch all links
  const { data: links, error: linksError } = await supabaseAdmin
    .from('usuarios_empresa')
    .select('user_id, empresa_id, rol');
    
  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });

  const empresas = [];
  
  // 3. Match emails via admin Auth API for 100% accuracy
  for (const emp of empresasData) {
     const emLinks = links.filter(l => l.empresa_id === emp.id);
     const repartidores = [];
     for (const l of emLinks) {
        let email = 'Desconocido';
        try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(l.user_id);
            if (authUser?.user) email = authUser.user.email || 'Desconocido';
        } catch(e) {}
        repartidores.push({ email, rol: l.rol, user_id: l.user_id });
     }
     empresas.push({ ...emp, repartidores });
  }

  return NextResponse.json({ empresas });
}
