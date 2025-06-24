import React, { useState, useEffect } from 'react';
import { categoryEmojis, fatherCategoryIcons } from '../utils/categoryEmojis';

// Hook for fetching grouped categories
export const useGroupedCategories = () => {
  const [groupedCategories, setGroupedCategories] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroupedCategories = async () => {
      try {
        const response = await fetch('/api/categories-grouped');
        if (response.ok) {
          const data = await response.json();
          setGroupedCategories(data);
        }
      } catch (error) {
        console.error('Error fetching grouped categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupedCategories();
  }, []);

  return { groupedCategories, loading };
};

// Reusable Category Dropdown Component
const CategoryDropdown = ({ 
  value, 
  onChange, 
  placeholder = "Select Category",
  disabled = false,
  style = {},
  includeEmptyOption = true
}) => {
  const { groupedCategories, loading } = useGroupedCategories();

  if (loading) {
    return (
      <select disabled style={style}>
        <option>Loading categories...</option>
      </select>
    );
  }

  // COICOP order for father categories
  const fatherCategoryOrder = [
    'FOOD',
    'ALCOHOLIC_TOBACCO', 
    'CLOTHING_FOOTWEAR',
    'HOUSING',
    'HOUSEHOLD_EQUIPMENT',
    'HEALTH',
    'TRANSPORT',
    'COMMUNICATION',
    'RECREATION',
    'EDUCATION',
    'RESTAURANTS_HOTELS',
    'MISCELLANEOUS'
  ];

  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '1rem',
        ...style
      }}
    >
      {includeEmptyOption && <option value="">{placeholder}</option>}
      
      {fatherCategoryOrder.map(fatherCode => {
        const fatherCategory = groupedCategories[fatherCode];
        if (!fatherCategory || !fatherCategory.children || fatherCategory.children.length === 0) {
          return null;
        }

        return (
          <optgroup 
            key={fatherCode} 
            label={`${fatherCategory.icon} ${fatherCategory.name}`}
          >
            {fatherCategory.children.map(childCategory => (
              <option key={childCategory} value={childCategory}>
                {categoryEmojis[childCategory] || '📂'} {childCategory.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
};

// Simple flat dropdown for backward compatibility
export const SimpleCategoryDropdown = ({ 
  value, 
  onChange, 
  categories = [],
  placeholder = "Select Category",
  disabled = false,
  style = {}
}) => {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        fontSize: '1rem',
        ...style
      }}
    >
      <option value="">{placeholder}</option>
      {categories.map(cat => (
        <option key={cat} value={cat}>
          {categoryEmojis[cat] || '📂'} {cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
        </option>
      ))}
    </select>
  );
};

export default CategoryDropdown;