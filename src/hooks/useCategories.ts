import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Sofa, Pill, Laptop, Car, Camera, Baby, Book, Shirt } from 'lucide-react';

// Map icon names to actual icon components
const iconMap = {
  'shopping-bag': ShoppingBag,
  'sofa': Sofa,
  'pill': Pill,
  'laptop': Laptop,
  'car': Car,
  'camera': Camera,
  'baby': Baby,
  'book': Book,
  'shirt': Shirt,
};

export interface Category {
  id: string;
  label: string;
  description: string | null;
  icon: keyof typeof iconMap;
  created_at: string | null;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('label', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        throw error;
      }

      // Transform data to include icon components
      const categories = data?.map(category => ({
        ...category,
        icon: category.icon as keyof typeof iconMap,
        iconComponent: iconMap[category.icon as keyof typeof iconMap] || ShoppingBag
      })) || [];

      // Add "All" category at the beginning
      return [
        {
          id: 'all',
          label: 'All',
          description: 'All shopping items',
          icon: 'shopping-bag' as keyof typeof iconMap,
          iconComponent: ShoppingBag,
          created_at: null
        },
        ...categories
      ];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};