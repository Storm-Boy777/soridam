INSERT INTO system_settings (key, value) VALUES
  ('payment_provider', '"creem"'),
  ('welcome_credit_cents', '0'),
  ('signup_enabled', 'true'),
  ('site_notice', '""'),
  ('site_name', '"소리담"'),
  ('site_description', '"AI 기반 OPIc 영어 말하기 학습 플랫폼"'),
  ('og_image_url', '"/images/og-image.png"')
ON CONFLICT (key) DO NOTHING;
