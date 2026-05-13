/**
 * Example: Products List Component
 * Demonstrates listing, filtering, and creating products
 */

import { useState } from 'react';
import { useProducts, useCreateProduct } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductsListExample() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  
  const { data, isLoading, error } = useProducts({
    page,
    search: searchTerm,
    category: category || undefined,
  });

  const createProduct = useCreateProduct();

  const handleCreateProduct = async () => {
    // Example: Create a new product
    const formData = new FormData();
    formData.append('name', 'Fresh Tomatoes');
    formData.append('description', 'Organic, locally grown');
    formData.append('category', 'vegetables');
    formData.append('price', '150');
    formData.append('quantity', '50');
    formData.append('unit', 'kg');
    // formData.append('image', fileInput.files[0]);

    await createProduct.mutateAsync(formData);
  };

  if (isLoading) {
    return <div className="space-y-4">{[...Array(5)].map(() => <Skeleton key={Math.random()} className="h-20" />)}</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading products</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="flex gap-4">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Input
          placeholder="Filter by category..."
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <Button onClick={handleCreateProduct} disabled={createProduct.isPending}>
          {createProduct.isPending ? 'Creating...' : 'Add Product'}
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.results?.map((product) => (
          <div key={product.id} className="border rounded-lg p-4">
            <h3 className="font-bold text-lg">{product.name}</h3>
            <p className="text-gray-600">{product.description}</p>
            <p className="text-sm mt-2">Category: {product.category}</p>
            <p className="text-lg font-bold mt-2">KES {product.price}</p>
            <p className="text-sm">Stock: {product.quantity} {product.unit}</p>
            <p className="text-xs text-gray-500 mt-2">By: {product.farmer_name}</p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <Button 
          disabled={!data?.previous} 
          onClick={() => setPage(page - 1)}
        >
          Previous
        </Button>
        <span className="text-sm">
          Page {page} of {Math.ceil((data?.count || 0) / 20)}
        </span>
        <Button 
          disabled={!data?.next} 
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
