import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
// @ts-ignore
import { inventoryAPI } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { useRoleGuard } from '@/hooks/useRoleGuard';

// Define a type for inventory items
type InventoryItem = {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  expirationDate?: string;
  description?: string;
};

export default function InventoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentView, setCurrentView] = useState<'all' | 'low-stock' | 'categories'>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  
  useRoleGuard(['clinic']);
  
  const goBack = () => {
    router.back();
  };
  
  // Fetch inventory data
  useEffect(() => {
    if (!user || user.userType !== 'clinic') {
      setError('This feature is only available to clinic users.');
      setLoading(false);
      return;
    }
    
    fetchInventory();
    fetchLowStock();
  }, [user]);
  
  // Fetch inventory based on current view
  const fetchInventory = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // For demonstration, we'll use mock data or fetch from API if available
      if (currentView === 'all') {
        const items = await inventoryAPI.getItems(user.id);
        setInventoryItems(items);
      } else if (currentView === 'low-stock') {
        const items = await inventoryAPI.getLowStockItems(user.id);
        setLowStockItems(items);
      } else if (currentView === 'categories' && selectedCategory) {
        const items = await inventoryAPI.getItemsByCategory(user.id, selectedCategory);
        setInventoryItems(items);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory. Please try again.');
      // Use mock data for demonstration
      const mockItems: InventoryItem[] = [
        { id: '1', itemName: 'Antibiotics', category: 'medicine', quantity: 20, unit: 'bottles', lowStockThreshold: 5 },
        { id: '2', itemName: 'Syringes', category: 'equipment', quantity: 50, unit: 'pcs', lowStockThreshold: 10 },
        { id: '3', itemName: 'Gauze', category: 'supplies', quantity: 3, unit: 'packs', lowStockThreshold: 5 },
        { id: '4', itemName: 'Pet Food (Small)', category: 'food', quantity: 8, unit: 'bags', lowStockThreshold: 5 },
        { id: '5', itemName: 'Antiparasitic', category: 'medicine', quantity: 2, unit: 'boxes', lowStockThreshold: 3 }
      ];
      
      setInventoryItems(mockItems);
      setLowStockItems(mockItems.filter(item => item.quantity <= item.lowStockThreshold));
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLowStock = async () => {
    if (!user?.id) return;
    try {
      const low = await inventoryAPI.getLowStock(user.id);
      setLowStockCount(low.length);
    } catch (err) {
      console.log('low stock fetch err', err);
    }
  };
  
  // Switch between different inventory views
  const switchView = (view: 'all' | 'low-stock' | 'categories', category?: string) => {
    setCurrentView(view);
    if (category) setSelectedCategory(category);
    fetchInventory();
  };
  
  // Add new inventory item
  const addItem = () => {
    Alert.alert(
      'Add Inventory Item',
      'This functionality will allow adding a new inventory item.',
      [{ text: 'OK' }]
    );
  };
  
  const renderItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.itemName}</Text>
        <Text style={[
          styles.quantityBadge,
          item.quantity <= item.lowStockThreshold ? styles.lowStockBadge : {}
        ]}>
          {item.quantity} {item.unit}
        </Text>
      </View>
      
      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category:</Text>
          <Text style={styles.detailValue}>{item.category}</Text>
        </View>
        {item.expirationDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expires:</Text>
            <Text style={styles.detailValue}>{new Date(item.expirationDate).toLocaleDateString()}</Text>
          </View>
        )}
        {item.description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Details:</Text>
            <Text style={styles.detailValue}>{item.description}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => Alert.alert('Edit', `Edit ${item.itemName} details`)}
        >
          <IconSymbol name="pencil" size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.restockButton]}
          onPress={() => Alert.alert('Restock', `Add more ${item.itemName} to inventory`)}
        >
          <IconSymbol name="plus" size={16} color="#FFF" />
          <Text style={styles.actionButtonText}>Restock</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Image 
            source={require('../../assets/images/left-arrow.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Inventory {lowStockCount > 0 && <Text style={{color:Colors.error}}>•</Text>}</Text>
        
        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <IconSymbol name="plus" size={20} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>
      
      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={[styles.filterButton, currentView === 'all' ? styles.activeFilter : {}]}
            onPress={() => switchView('all')}
          >
            <Text style={styles.filterText}>All Items</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, currentView === 'low-stock' ? styles.activeFilter : {}]}
            onPress={() => switchView('low-stock')}
          >
            <IconSymbol name="exclamationmark.triangle" size={14} color="orange" />
            <Text style={styles.filterText}>Low Stock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, currentView === 'categories' && selectedCategory === 'medicine' ? styles.activeFilter : {}]}
            onPress={() => switchView('categories', 'medicine')}
          >
            <Text style={styles.filterText}>Medicine</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, currentView === 'categories' && selectedCategory === 'equipment' ? styles.activeFilter : {}]}
            onPress={() => switchView('categories', 'equipment')}
          >
            <Text style={styles.filterText}>Equipment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, currentView === 'categories' && selectedCategory === 'supplies' ? styles.activeFilter : {}]}
            onPress={() => switchView('categories', 'supplies')}
          >
            <Text style={styles.filterText}>Supplies</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, currentView === 'categories' && selectedCategory === 'food' ? styles.activeFilter : {}]}
            onPress={() => switchView('categories', 'food')}
          >
            <Text style={styles.filterText}>Pet Food</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Loading inventory...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContent}>
            <IconSymbol name="exclamationmark.circle" size={40} color="red" />
            <Text style={styles.errorText}>{error}</Text>
            <Button 
              title="Retry" 
              onPress={fetchInventory} 
              variant="primary" 
              size="medium" 
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <FlatList
            data={currentView === 'low-stock' ? lowStockItems : inventoryItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.centerContent}>
                <IconSymbol name="tray" size={40} color={Colors.light.icon} />
                <Text style={styles.emptyText}>No items found</Text>
                <Text style={styles.emptySubtext}>
                  {currentView === 'low-stock' 
                    ? 'No items are running low on stock' 
                    : 'Start by adding items to your inventory'}
                </Text>
                <Button 
                  title="Add Item" 
                  onPress={addItem} 
                  variant="primary" 
                  size="medium" 
                  style={{ marginTop: 16 }}
                />
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.light.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 4,
  },
  activeFilter: {
    backgroundColor: Colors.light.tint + '30',
    borderWidth: 1,
    borderColor: Colors.light.tint,
  },
  listContainer: {
    padding: 16,
  },
  inventoryItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  quantityBadge: {
    backgroundColor: Colors.light.success + '30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    color: Colors.light.success,
    fontWeight: '600',
  },
  lowStockBadge: {
    backgroundColor: Colors.light.error + '30',
    color: Colors.light.error,
  },
  itemDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.icon,
    width: 70,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.light.text,
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: Colors.light.tint,
  },
  restockButton: {
    backgroundColor: Colors.light.success,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.icon,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.light.icon,
    marginTop: 4,
    textAlign: 'center',
  },
}); 