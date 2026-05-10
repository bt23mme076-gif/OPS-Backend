const jwt = require('jsonwebtoken');
const postgres = require('postgres');

const sql = postgres("postgresql://postgres.ofcbgevwmziypxixkiiq:123456789nitinrai2266@aws-1-ap-south-1.pooler.supabase.com:6543/postgres");

async function run() {
  try {
    const res = await sql`SELECT id, email, role, squad FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1`;
    if (res.length === 0) {
      console.log('No super admin found');
      return;
    }
    const user = res[0];
    
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role, squad: user.squad },
      'your-super-secret-jwt-key-change-this-in-production',
      { expiresIn: '1h' }
    );

    const apiRes = await fetch('http://localhost:4000/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `atyant_token=${token}`
      },
      body: JSON.stringify({
        title: 'Test Task with exact frontend payload',
        description: '',
        priority: 'MEDIUM',
        squad: 'TECH',
        assignedToId: user.id, 
        dueDate: '2026-05-15T12:00',
        proofLink: '',
        feedback: '',
        status: 'TODO',
        assignedById: user.id
      })
    });
    
    const text = await apiRes.text();
    console.log('Status:', apiRes.status);
    console.log('Body:', text);
  } catch (err) {
    console.error(err);
  } finally {
    sql.end();
  }
}

run();
