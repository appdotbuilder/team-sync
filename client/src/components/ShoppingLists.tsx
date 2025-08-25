import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart, Check, X, Edit3, Trash2 } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { Team, ShoppingList, ShoppingItem, CreateShoppingListInput, CreateShoppingItemInput, UpdateShoppingItemInput } from '../../../server/src/schema';

interface ShoppingListsProps {
  team: Team;
  currentUserId: number;
}

export function ShoppingLists({ team, currentUserId }: ShoppingListsProps) {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [items, setItems] = useState<Record<number, ShoppingItem[]>>({});
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [isCreateListDialogOpen, setIsCreateListDialogOpen] = useState(false);
  const [isCreateItemDialogOpen, setIsCreateItemDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [createListFormData, setCreateListFormData] = useState<CreateShoppingListInput>({
    team_id: team.id,
    name: '',
    description: null
  });

  const [createItemFormData, setCreateItemFormData] = useState<CreateShoppingItemInput>({
    shopping_list_id: 0,
    name: '',
    quantity: 1,
    comment: null
  });

  const loadShoppingLists = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTeamShoppingLists.query({ team_id: team.id });
      setShoppingLists(result);
      // Auto-select first list if available
      if (result.length > 0 && !selectedList) {
        setSelectedList(result[0]);
      }
    } catch (error) {
      console.error('Failed to load shopping lists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [team.id, selectedList]);

  const loadItems = useCallback(async (shoppingListId: number) => {
    try {
      const result = await trpc.getShoppingListItems.query({ shopping_list_id: shoppingListId });
      setItems((prev: Record<number, ShoppingItem[]>) => ({ ...prev, [shoppingListId]: result }));
    } catch (error) {
      console.error('Failed to load shopping items:', error);
    }
  }, []);

  useEffect(() => {
    loadShoppingLists();
  }, [loadShoppingLists]);

  useEffect(() => {
    if (selectedList) {
      loadItems(selectedList.id);
    }
  }, [selectedList, loadItems]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createListFormData.name.trim()) return;

    try {
      setIsLoading(true);
      const newList = await trpc.createShoppingList.mutate(createListFormData);
      setShoppingLists((prev: ShoppingList[]) => [...prev, newList]);
      setSelectedList(newList);
      setCreateListFormData({
        team_id: team.id,
        name: '',
        description: null
      });
      setIsCreateListDialogOpen(false);
    } catch (error) {
      console.error('Failed to create shopping list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createItemFormData.name.trim() || !selectedList) return;

    const itemData = {
      ...createItemFormData,
      shopping_list_id: selectedList.id
    };

    try {
      setIsLoading(true);
      const newItem = await trpc.createShoppingItem.mutate(itemData);
      setItems((prev: Record<number, ShoppingItem[]>) => ({
        ...prev,
        [selectedList.id]: [...(prev[selectedList.id] || []), newItem]
      }));
      setCreateItemFormData({
        shopping_list_id: 0,
        name: '',
        quantity: 1,
        comment: null
      });
      setIsCreateItemDialogOpen(false);
    } catch (error) {
      console.error('Failed to create shopping item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPurchaseToggle = async (item: ShoppingItem) => {
    if (!selectedList) return;

    try {
      const updateData: UpdateShoppingItemInput = {
        id: item.id,
        is_purchased: !item.is_purchased
      };
      
      await trpc.updateShoppingItem.mutate(updateData);
      
      setItems((prev: Record<number, ShoppingItem[]>) => ({
        ...prev,
        [selectedList.id]: (prev[selectedList.id] || []).map((i: ShoppingItem) =>
          i.id === item.id 
            ? { 
                ...i, 
                is_purchased: !item.is_purchased,
                purchased_by: !item.is_purchased ? currentUserId : null,
                purchased_at: !item.is_purchased ? new Date() : null
              } 
            : i
        )
      }));
    } catch (error) {
      console.error('Failed to update item purchase status:', error);
    }
  };

  const handleQuantityUpdate = async (item: ShoppingItem, newQuantity: number) => {
    if (!selectedList || newQuantity < 1) return;

    try {
      const updateData: UpdateShoppingItemInput = {
        id: item.id,
        quantity: newQuantity
      };
      
      await trpc.updateShoppingItem.mutate(updateData);
      
      setItems((prev: Record<number, ShoppingItem[]>) => ({
        ...prev,
        [selectedList.id]: (prev[selectedList.id] || []).map((i: ShoppingItem) =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        )
      }));
    } catch (error) {
      console.error('Failed to update item quantity:', error);
    }
  };

  const currentItems = selectedList ? (items[selectedList.id] || []) : [];
  const pendingItems = currentItems.filter((item: ShoppingItem) => !item.is_purchased);
  const purchasedItems = currentItems.filter((item: ShoppingItem) => item.is_purchased);
  const totalItems = currentItems.length;
  const completedItems = purchasedItems.length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shopping Lists - {team.name}</h2>
          <p className="text-gray-600">Collaborate on shopping with real-time updates</p>
        </div>
        <Dialog open={isCreateListDialogOpen} onOpenChange={setIsCreateListDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New List
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateList}>
              <DialogHeader>
                <DialogTitle>Create Shopping List</DialogTitle>
                <DialogDescription>
                  Create a new shared shopping list for your team.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="list-name">List Name</Label>
                  <Input
                    id="list-name"
                    value={createListFormData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCreateListFormData((prev: CreateShoppingListInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter list name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="list-description">Description (optional)</Label>
                  <Textarea
                    id="list-description"
                    value={createListFormData.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setCreateListFormData((prev: CreateShoppingListInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    placeholder="Describe the purpose of this list"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateListDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !createListFormData.name.trim()}>
                  {isLoading ? 'Creating...' : 'Create List'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Shopping Lists Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lists</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {shoppingLists.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <ShoppingCart className="mx-auto h-8 w-8 mb-2 text-gray-400" />
                  <p className="text-sm">No lists yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {shoppingLists.map((list: ShoppingList) => {
                    const listItems = items[list.id] || [];
                    const completed = listItems.filter(item => item.is_purchased).length;
                    const total = listItems.length;
                    
                    return (
                      <button
                        key={list.id}
                        onClick={() => setSelectedList(list)}
                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                          selectedList?.id === list.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">{list.name}</div>
                        {list.description && (
                          <div className="text-xs text-gray-500 mt-1 truncate">{list.description}</div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-xs text-gray-400">
                            {completed}/{total} items
                          </div>
                          {total > 0 && (
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.round((completed / total) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Items View */}
        <div className="lg:col-span-3">
          {selectedList ? (
            <div className="space-y-6">
              {/* List Header */}
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{selectedList.name}</h3>
                  {selectedList.description && (
                    <p className="text-gray-600 text-sm mt-1">{selectedList.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <Badge variant={progress === 100 ? 'default' : 'secondary'}>
                      {completedItems}/{totalItems} completed
                    </Badge>
                    <div className="text-sm text-gray-600">
                      {progress}% done
                    </div>
                  </div>
                </div>
                <Dialog open={isCreateItemDialogOpen} onOpenChange={setIsCreateItemDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleCreateItem}>
                      <DialogHeader>
                        <DialogTitle>Add Item</DialogTitle>
                        <DialogDescription>
                          Add a new item to {selectedList.name}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="item-name">Item Name</Label>
                          <Input
                            id="item-name"
                            value={createItemFormData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateItemFormData((prev: CreateShoppingItemInput) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="Enter item name"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="item-quantity">Quantity</Label>
                          <Input
                            id="item-quantity"
                            type="number"
                            min="1"
                            value={createItemFormData.quantity}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setCreateItemFormData((prev: CreateShoppingItemInput) => ({ 
                                ...prev, 
                                quantity: parseInt(e.target.value) || 1 
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="item-comment">Comment (optional)</Label>
                          <Textarea
                            id="item-comment"
                            value={createItemFormData.comment || ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                              setCreateItemFormData((prev: CreateShoppingItemInput) => ({
                                ...prev,
                                comment: e.target.value || null
                              }))
                            }
                            placeholder="Brand, size, notes..."
                            rows={2}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsCreateItemDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !createItemFormData.name.trim()}>
                          {isLoading ? 'Adding...' : 'Add Item'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Progress Bar */}
              {totalItems > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Items List */}
              <div className="space-y-4">
                {/* Pending Items */}
                {pendingItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Shopping List ({pendingItems.length} items)
                    </h4>
                    <div className="space-y-2">
                      {pendingItems.map((item: ShoppingItem) => (
                        <Card key={item.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={item.is_purchased}
                                onCheckedChange={() => handleItemPurchaseToggle(item)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium">{item.name}</h5>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleQuantityUpdate(item, Math.max(1, item.quantity - 1))}
                                      className="h-8 w-8 p-0"
                                    >
                                      -
                                    </Button>
                                    <span className="text-sm font-medium px-2">{item.quantity}</span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                                      className="h-8 w-8 p-0"
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>
                                {item.comment && (
                                  <p className="text-sm text-gray-600 mt-1">{item.comment}</p>
                                )}
                                <div className="text-xs text-gray-500 mt-2">
                                  Added {item.created_at.toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchased Items */}
                {purchasedItems.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-600 mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Purchased ({purchasedItems.length} items)
                    </h4>
                    <div className="space-y-2">
                      {purchasedItems.map((item: ShoppingItem) => (
                        <Card key={item.id} className="bg-green-50 border-green-200 opacity-75">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                checked={item.is_purchased}
                                onCheckedChange={() => handleItemPurchaseToggle(item)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h5 className="font-medium line-through text-gray-600">{item.name}</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {item.quantity}x
                                  </Badge>
                                </div>
                                {item.comment && (
                                  <p className="text-sm text-gray-500 mt-1 line-through">{item.comment}</p>
                                )}
                                {item.purchased_at && (
                                  <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                    <Check className="h-3 w-3" />
                                    Purchased {item.purchased_at.toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {currentItems.length === 0 && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="font-semibold text-gray-900 mb-2">No Items Yet</h3>
                      <p className="text-gray-600 text-center mb-4">
                        Start adding items to your shopping list!
                      </p>
                      <Button onClick={() => setIsCreateItemDialogOpen(true)} className="inline-flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add First Item
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">No List Selected</h3>
                <p className="text-gray-600 text-center">
                  {shoppingLists.length === 0 
                    ? 'Create your first shopping list to get started!'
                    : 'Select a list from the sidebar to view and manage items'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}