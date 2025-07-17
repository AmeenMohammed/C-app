-- Add user-requested categories to the categories table
INSERT INTO public.categories (id, label, description, icon) VALUES
('spare-parts', 'Spare Parts', 'Replacement parts and components', 'wrench'),
('lost-found', 'Lost & Found', 'Lost and found items', 'search'),
('tools', 'Tools', 'Tools and hardware equipment', 'hammer'),
('beauty', 'Beauty', 'Beauty and personal care products', 'sparkles'),
('pets', 'Pets', 'Pet supplies and accessories', 'heart'),
('other', 'Other', 'Items that do not fit other categories', 'more-horizontal')

ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;