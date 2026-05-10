const db = require('./db');

function bootstrap() {
  db.ensureDb();
}

module.exports = { bootstrap };
