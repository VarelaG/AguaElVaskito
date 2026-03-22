import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  // Security: Only allow superadmin
  // We validate via the Authorization header (the user's JWT from the browser)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Use service role to bypass RLS and list ALL companies
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify the user token is valid and belongs to the superadmin
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (authError || !user || user.email !== 'varelag1999@gmail.com') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('empresas')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ empresas: data });
}
