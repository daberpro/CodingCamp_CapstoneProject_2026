import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const seedDummyUsers = async () => {
  try {
    // Hash password
    const password1 = await bcrypt.hash('kasir123', 10);
    const password2 = await bcrypt.hash('admin123', 10);
    const password3 = await bcrypt.hash('superadmin123', 10);

    // Insert dummy users
    const { data, error } = await supabase
      .from('user')
      .insert([
        {
          username: 'Kasir Toko',
          email: 'kasir@gmail.com',
          password: password1,
          roles: 'kasir',
          avatar_url: 'https://via.placeholder.com/150'
        },
        {
          username: 'Admin Toko',
          email: 'admin1@gmail.com',
          password: password2,
          roles: 'admin',
          avatar_url: 'https://via.placeholder.com/150'
        },
        {
          username: 'Super Admin',
          email: 'superadmin@gmail.com',
          password: password3,
          roles: 'super-admin',
          avatar_url: 'https://via.placeholder.com/150'
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error insert user:', error.message);
      return;
    }

    console.log('✅ Dummy users berhasil dibuat:');
    console.log('\n📧 Kasir:');
    console.log('   Email: kasir@gmail.com');
    console.log('   Password: kasir123\n');
    console.log('📧 Admin:');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: admin123\n');
    console.log('📧 Super Admin:');
    console.log('   Email: superadmin@gmail.com');
    console.log('   Password: superadmin123\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
};

seedDummyUsers();