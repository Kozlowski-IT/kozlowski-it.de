// Integrationstests laufen immer gegen die Test-DB (nie gegen die Dev-DB).
// Muss VOR dotenv stehen: dotenv überschreibt bereits gesetzte Variablen nicht.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://cms@localhost:5433/cms_test'
process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret'
// Kein echter Builder in Tests: leere Werte blockieren die aus .env (dotenv überschreibt nicht).
// publish.int.spec.ts setzt sie gezielt auf einen Mock-Server.
process.env.BUILDER_URL = ''
process.env.BUILDER_TOKEN = ''
process.env.PREVIEW_URL = ''

import 'dotenv/config'
