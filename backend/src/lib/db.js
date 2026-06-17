const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { realtime: { transport: ws } }
);

async function query(sql, params = []) {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_text: sql,
    sql_params: params,
  });
  if (error) throw new Error(error.message);
  return { rows: Array.isArray(data) ? data : [] };
}

// Fake transaction client — BEGIN/COMMIT/ROLLBACK are no-ops in exec_sql
async function connect() {
  return {
    query: (sql, params) => query(sql, params),
    release: () => {},
  };
}

module.exports = { query, connect };
