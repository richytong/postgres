# Postgres
Sweet API wrapper for Postgres on top of `pg-pool`. 

# Usage
```Javascript
import Postgres from '@richytong/postgres';

const { database, close } = Postgres({
  host: YOUR_HOST,
  port: YOUR_PORT,
  user: YOUR_USER,
  password: YOUR_PASSWORD,
  database: YOUR_DB_NAME,
});

// fetch users with array variables and index interpolation
const users = await database.query(`
  SELECT * FROM users WHERE userId = $1
`,['1']);

// fetch users with object variables and name interpolation
const users = await database.query(`
  SELECT * FROM users WHERE userId = @userId
`, { userId: '1' });

// insert
const userRowToInsert = {
  userId: '2',
  name: 'manting',
  email: 'manting@his.mothers.house',
  created: Date.now(),
  updated: Date.now(),
};
const rowsYouJustInserted = await database.table('users').insert(userRowToInsert);

// upsert
const userRowToUpsert = {
  userId: '3',
  name: 'tommy',
  email: 'tommy@yish.co',
  created: Date.now(),
  updated: Date.now(),
};
const rowsYouJustUpserted = await database.table('users').upsert(userRowToUpsert, {
  conflictTarget: 'userId', // (required) look for conflicts on userId, use array for multiple conflict lookup columns
  excludeOnConflict: 'created', // don't overwrite created timestamp when you update, use array for multiple rows excluded
})

// update
// why update when you can upsert?

// when you're done
await close();
```