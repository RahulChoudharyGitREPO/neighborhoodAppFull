require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../src/config/env');

async function fixIndexes() {
  await mongoose.connect(config.mongodb.uri);
  const col = mongoose.connection.collection('favorites');

  // List current indexes
  const indexes = await col.indexes();
  console.log('Current indexes:', JSON.stringify(indexes, null, 2));

  // Drop all non-_id indexes
  for (const idx of indexes) {
    if (idx.name !== '_id_') {
      try {
        await col.dropIndex(idx.name);
        console.log('Dropped:', idx.name);
      } catch (e) {
        console.log('Could not drop', idx.name, e.message);
      }
    }
  }

  // Clean up documents with null requestId/offerId - unset the null fields
  const result = await col.updateMany(
    { requestId: null },
    { $unset: { requestId: '' } }
  );
  console.log('Cleaned requestId nulls:', result.modifiedCount);

  const result2 = await col.updateMany(
    { offerId: null },
    { $unset: { offerId: '' } }
  );
  console.log('Cleaned offerId nulls:', result2.modifiedCount);

  // Now load the model to recreate correct indexes
  require('../src/models/Favorite');
  await mongoose.model('Favorite').ensureIndexes();

  const newIndexes = await col.indexes();
  console.log('New indexes:', JSON.stringify(newIndexes, null, 2));

  await mongoose.disconnect();
  console.log('Done');
}

fixIndexes();
