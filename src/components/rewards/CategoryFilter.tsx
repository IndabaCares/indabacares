import React from 'react';
import { ScrollView } from 'react-native';
import { Chip } from '@/components/ui/Chip';

interface Category {
  id: string;
  name: string;
}

interface CategoryFilterProps {
  categories: Category[];
  selected: string | undefined;
  onSelect: (id: string | undefined) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
      <Chip
        label="All"
        selected={!selected}
        onPress={() => onSelect(undefined)}
      />
      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name}
          selected={selected === cat.id}
          onPress={() => onSelect(cat.id)}
        />
      ))}
    </ScrollView>
  );
}
