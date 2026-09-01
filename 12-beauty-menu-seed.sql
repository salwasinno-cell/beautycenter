-- ============================================================================
-- SEED: Beauty Menu categories + services shown on menu.html
-- ============================================================================
-- Safe to re-run: existing rows are left untouched (ON CONFLICT DO NOTHING).
--
-- NOTE: prices below are RANDOM PLACEHOLDERS (requested as a stand-in until
-- real pricing is set) — not your actual rates. Durations are also generic
-- placeholders. Update both in the admin dashboard (Manage Services) once
-- you have your real price list.
-- ============================================================================

insert into categories (id, name) values
  ('hair', 'Hair'),
  ('makeup', 'Makeup'),
  ('skin', 'Skin'),
  ('nails', 'Nails'),
  ('spa', 'Spa'),
  ('bridal', 'Bridal'),
  ('brows', 'Brows & Lashes')
on conflict (id) do nothing;

insert into services (id, category_id, name, price, duration_minutes, description, online_bookable) values
  ('hair-hair-color', 'hair', 'Hair Color', 40, 20, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-hair-styling', 'hair', 'Hair Styling', 65, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-hair-straightening', 'hair', 'Hair Straightening', 60, 30, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-hair-spa', 'hair', 'Hair Spa', 40, 90, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-hair-fall-treatments', 'hair', 'Hair Fall Treatments', 35, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-keratin-treatments', 'hair', 'Keratin Treatments', 30, 20, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-braids', 'hair', 'Braids', 35, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-blow-dry', 'hair', 'Blow Dry', 60, 90, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-shampoo-and-conditioning', 'hair', 'Shampoo & Conditioning', 120, 20, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-brazilian-blowout', 'hair', 'Brazilian Blowout', 110, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('hair-hair-care-and-services', 'hair', 'Hair Care & Services', 110, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('makeup-make-up-services', 'makeup', 'Make-Up Services', 75, 75, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('skin-skin-care', 'skin', 'Skin Care', 70, 20, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('skin-facial-treatments', 'skin', 'Facial Treatments', 55, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('skin-waxing', 'skin', 'Waxing', 80, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('skin-brazilian-waxing', 'skin', 'Brazilian Waxing', 50, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('skin-body-waxing', 'skin', 'Body Waxing', 80, 30, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('skin-waxing-and-bleach', 'skin', 'Waxing & Bleach', 40, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('nails-manicure', 'nails', 'Manicure', 20, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('nails-pedicure', 'nails', 'Pedicure', 40, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('nails-manicure-and-pedicure', 'nails', 'Manicure & Pedicure', 15, 75, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('nails-nail-extensions', 'nails', 'Nail Extensions', 55, 30, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('nails-plastic-nails', 'nails', 'Plastic Nails', 45, 30, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('nails-gel-polish', 'nails', 'Gel Polish', 55, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('spa-moroccan-bath', 'spa', 'Moroccan Bath', 130, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('spa-spa-therapy', 'spa', 'Spa Therapy', 125, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('spa-steam-bath', 'spa', 'Steam Bath', 45, 20, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('spa-paraffin-wax', 'spa', 'Paraffin Wax', 70, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('spa-massage', 'spa', 'Massage', 45, 45, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('spa-body-massage', 'spa', 'Body Massage', 50, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('spa-body-scrubs', 'spa', 'Body Scrubs', 75, 75, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('bridal-henna-design', 'bridal', 'Henna Design', 70, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true),
  ('brows-eyebrow-threading', 'brows', 'Eyebrow Threading', 15, 60, 'Placeholder pricing — update with real rate in the admin dashboard.', true)
on conflict (id) do nothing;
