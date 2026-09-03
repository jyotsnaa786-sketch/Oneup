const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://oneup_admin:Oneup12345@cluster0.mmwbfr7.mongodb.net/oneup_motors_portal?retryWrites=true&w=majority&appName=Cluster0';
const ADMIN_EMAIL = 'jyotsnaa786@gmail.com';
const ADMIN_PASS = 'girdhar123';

async function fixCloudDb() {
  console.log("Connecting to MongoDB Atlas...");
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const dbInstance = client.db("oneup_motors_portal");
    const cloudDbCollection = dbInstance.collection("persistent_state");

    const cloudRecord = await cloudDbCollection.findOne({ _id: "primary_database" });
    if (cloudRecord && cloudRecord.data) {
      console.log("Found primary_database record in Cloud MongoDB.");
      let data = cloudRecord.data;
      data.login_attempts = {};

      if (!data.users) data.users = [];
      let admin = data.users.find(u => u.email === ADMIN_EMAIL);
      const hash = bcrypt.hashSync(ADMIN_PASS, 10);
      if (admin) {
        admin.password_hash = hash;
        console.log(`Updated existing admin password_hash for ${ADMIN_EMAIL}`);
      } else {
        data.users.push({
          id: '6a6c8ca3c8557f58c23d3a27',
          email: ADMIN_EMAIL,
          name: 'OneUP Admin Manager',
          role: 'admin',
          password_hash: hash,
          created_at: new Date().toISOString()
        });
        console.log(`Created admin account for ${ADMIN_EMAIL}`);
      }

      await cloudDbCollection.updateOne(
        { _id: "primary_database" },
        { $set: { last_updated: new Date().toISOString(), data: data } },
        { upsert: true }
      );
      console.log("✅ Cloud MongoDB persistent_state successfully updated and unlocked!");
    } else {
      console.log("No primary_database record found in Cloud MongoDB.");
    }
  } catch (err) {
    console.error("Error updating Cloud MongoDB:", err);
  } finally {
    await client.close();
  }
}

fixCloudDb();
