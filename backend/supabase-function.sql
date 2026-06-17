-- Run this ONCE in Supabase SQL Editor
-- It lets the backend execute any SQL query over HTTPS (no TCP connection needed)

CREATE OR REPLACE FUNCTION exec_sql(
  sql_text   text,
  sql_params jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result     jsonb;
  final_sql  text := sql_text;
  param_elem jsonb;
  i          int  := 1;
  param_str  text;
  trimmed    text;
BEGIN
  trimmed := upper(trim(final_sql));

  -- BEGIN / COMMIT / ROLLBACK become no-ops (transactions not needed over REST)
  IF trimmed IN ('BEGIN', 'COMMIT', 'ROLLBACK') THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Substitute $1, $2, ... with properly quoted values from the params array
  FOR param_elem IN SELECT value FROM jsonb_array_elements(sql_params)
  LOOP
    CASE jsonb_typeof(param_elem)
      WHEN 'string'  THEN param_str := quote_literal(param_elem #>> '{}');
      WHEN 'number'  THEN param_str := param_elem #>> '{}';
      WHEN 'boolean' THEN param_str := param_elem #>> '{}';
      WHEN 'null'    THEN param_str := 'NULL';
      WHEN 'array'   THEN
        SELECT 'ARRAY[' || string_agg(quote_literal(v), ',') || ']'
        INTO   param_str
        FROM   jsonb_array_elements_text(param_elem) v;
        param_str := COALESCE(param_str, 'ARRAY[]::text[]');
      ELSE
        param_str := quote_literal(param_elem::text);
    END CASE;

    -- Replace $i (not followed by another digit to avoid $1 matching $10)
    final_sql := regexp_replace(
      final_sql,
      '\$' || i || '(?![0-9])',
      param_str,
      'g'
    );
    i := i + 1;
  END LOOP;

  -- SELECT / WITH / queries with RETURNING → aggregate rows into JSON array
  IF trimmed ~ '^(SELECT|WITH)' OR final_sql ~* '\bRETURNING\b' THEN
    EXECUTE format(
      'SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t',
      final_sql
    ) INTO result;
  ELSE
    -- INSERT / UPDATE / DELETE without RETURNING
    EXECUTE final_sql;
    result := '[]'::jsonb;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'exec_sql error: % | query: %', SQLERRM, left(final_sql, 400);
END;
$$;
