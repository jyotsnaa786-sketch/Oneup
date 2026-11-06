const fs = require('fs');
const path = require('path');
const { MongoClient } = require('../backend/node_modules/mongodb');
const MONGODB_URI = 'mongodb+srv://oneup_admin:Oneup12345@cluster0.mmwbfr7.mongodb.net/oneup_motors_portal?retryWrites=true&w=majority&appName=Cluster0';

async function syncDraftsToCloud() {
  const dbLocal = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/data/db.json'), 'utf8'));
  console.log('Local drafts to sync:', dbLocal.drafts ? dbLocal.drafts.length : 0);
  
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const collection = client.db('oneup_motors_portal').collection('persistent_state');

  const updateRes = await collection.updateOne(
    { _id: 'primary_database' },
    { $set: { 'data.drafts': dbLocal.drafts, updated_at: new Date().toISOString() } }
  );
  console.log('MongoDB Atlas Drafts Sync modifiedCount:', updateRes.modifiedCount);

  // Verify
  const doc = await collection.findOne({ _id: 'primary_database' });
  console.log('Verified Cloud Drafts Count:', doc.data.drafts ? doc.data.drafts.length : 0);
  if (doc.data.drafts && doc.data.drafts.length > 0) {
    const d = doc.data.drafts[0];
    console.log('Cloud Draft ID:', d.id);
    console.log('Cloud Draft Evaluated Items:', Object.keys(d.state || {}).length);
  }
  await client.close();
}

syncDraftsToCloud().catch(console.error);
