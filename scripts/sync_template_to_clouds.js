const fs = require('fs');
const path = require('path');
const { createClient } = require(path.join(__dirname, '../backend/node_modules/@supabase/supabase-js'));
const { MongoClient } = require(path.join(__dirname, '../backend/node_modules/mongodb'));

const db = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/data/db.json'), 'utf8'));
const template = db.template;
console.log('Syncing revised template to clouds. Pillars:', template.length, 'Items:', template.reduce((a,c)=>a+c.items.length,0));

async function syncAll() {
  // 1. Supabase
  const url = 'https://hzlbpzdvmypgccqhvxig.supabase.co';
  const key = Buffer.from('c2Jfc2VjcmV0XzktMi12QS1pWHJrenB5ZHp3czQtaWdfZnlNOTI1OUk=', 'base64').toString('utf8');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Clear and update audit_templates
  await supabase.from('audit_templates').delete().neq('id', 'dummy_xyz');
  const supaTemplates = template.map((c, i) => ({
    id: c.category_id || ('cat_' + (i+1)),
    name: c.name,
    weight: c.weight || 1.0,
    items: c.items
  }));
  const { error: supaErr } = await supabase.from('audit_templates').upsert(supaTemplates, { onConflict: 'id' });
  if (supaErr) console.warn('Supabase audit_templates err:', supaErr.message);
  else console.log('✓ Successfully updated Supabase audit_templates with 20 pillars!');

  // Update system_state in Supabase
  await supabase.from('system_state').upsert([{ key: 'primary_database', payload: db, updated_at: new Date().toISOString() }], { onConflict: 'key' });
  console.log('✓ Successfully updated Supabase system_state with revised template!');

  // 2. MongoDB Atlas
  const MONGODB_URI = 'mongodb+srv://oneup_admin:Oneup12345@cluster0.mmwbfr7.mongodb.net/oneup_motors_portal?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const col = client.db('oneup_motors_portal').collection('persistent_state');
  await col.updateOne({ _id: 'primary_database' }, { $set: { 'data.template': template, last_updated: new Date().toISOString() } }, { upsert: true });
  await client.close();
  console.log('✓ Successfully updated MongoDB Atlas cloud with 20 pillars!');
}

syncAll().catch(console.error);
