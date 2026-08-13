SELECT cron.unschedule('bundle-sync-6h') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'bundle-sync-6h');

SELECT cron.schedule(
  'bundle-sync-6h',
  '35 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fbjlpvtvwykfjvijxyio.supabase.co/functions/v1/bundle-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.social_cron_secret', true)
    ),
    body := jsonb_build_object('scheduled', true)
  );
  $$
);