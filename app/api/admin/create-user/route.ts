import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, full_name, role } = body;

    // Supabase Admin Client oluştur (Service Role Key ile)
    // Bu key, tüm kısıtlamaları aşar ve admin işlemi yapar.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // .env dosyana eklemelisin!
    );

    // 1. Kullanıcıyı Oluştur
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // E-posta onayını otomatik yap
      user_metadata: { full_name, role } // Metadata olarak ekle
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // 2. Profil Tablosuna Ekle (Trigger varsa gerek yok ama garanti olsun)
    // Eğer SQL'de trigger yazdıysak burayı atlayabilirsin, ama yazmadıysak bu satır hayat kurtarır.
    /*
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: user.user.id,
        email: email,
        full_name: full_name,
        role: role
    });
    */

    return NextResponse.json({ success: true, user });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}