-- Insert initial categories data
INSERT INTO public.categories (id, label, description, icon) VALUES
('furniture', 'Furniture', 'Home and office furniture', 'sofa'),
('medicine', 'Medicine', 'Medical and health items', 'pill'),
('electronics', 'Electronics', 'Electronic devices', 'laptop'),
('vehicles', 'Vehicles', 'Cars and vehicles', 'car'),
('cameras', 'Cameras', 'Cameras and photography gear', 'camera'),
('baby', 'Baby Items', 'Baby products and accessories', 'baby'),
('books', 'Books', 'Books and publications', 'book'),
('fashion', 'Fashion', 'Clothing and accessories', 'shirt')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;