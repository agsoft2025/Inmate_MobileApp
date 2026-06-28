import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import apiClient from '../../src/services/api/client';

type WorkAssignId = {
  _id: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
};

type Transaction = {
  _id: string;
  inmateId: string;
  custodyType: string;
  transaction: string;
  workAssignId: WorkAssignId | string | null; // Can be object, string, or null
  hoursWorked: number;
  wageAmount: number;
  depositAmount: number;
  depositName?: string;
  depositType?: string;
  type: string;
  status: string;
  source: string;
  amount?: number;
  relationShipId?: string;
  products?: Array<{
    productId: {
      _id: string;
      itemName: string;
      description: string;
      price: number;
      stockQuantity: number;
      category: string;
      itemNo: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
    };
    quantity: number;
    _id: string;
  }>;
  totalAmount?: number;
  is_reversed?: boolean;
  isReversed?: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
};

type ApiResponse = {
  success: boolean;
  range: string;
  count: number;
  page: number;
  limit: number;
  totalRecords: number;
  transactions: Transaction[];
  totalPages: number;
  totals: {
    totalPosAmount: number;
    totalPosReversedAmount: number;
    totalFinancialAmount: number;
  };
};

export default function TransactionsScreen() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalItems: 0,
    hasItems: false
  });

  const fetchTransactions = useCallback(async () => {
    if (!user?.username) return;

    try {
      setLoading(true);
      setError(null);
      const currentPage = Math.max(1, pagination.page);

      const response = await apiClient.get<ApiResponse>(
        `transactions/device?range=all&page=${currentPage}&limit=${pagination.limit}&inmateId=${user.username}`
      );

      setPagination({
        ...pagination,
        // page: response.data.page,
        totalPages: response.data.totalRecords,
        totalItems: response.data.totalRecords,
        hasItems: response.data.transactions.length > 0
      })

      const responseData = response.data;

      if (responseData.success) {
        setTransactions(responseData.transactions);

        // Ensure we have valid page numbers from API
        const apiPage = Math.max(1, responseData.page || 1);
        const apiTotalPages = Math.max(1, responseData.totalPages || 1);
        const hasItems = responseData.transactions.length > 0;

        setPagination(prev => ({
          ...prev,
          page: hasItems ? apiPage : 1,
          totalPages: apiTotalPages,
          totalItems: responseData.totalRecords || 0,
          hasItems
        }));

        setError(null);
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (err) {
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.username, pagination.page, pagination.limit]);

  // Refresh transactions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getTransactionType = (txn: Transaction): 'credit' | 'debit' => {
    // If it's a deposit or financial credit, it's a credit
    if (txn.custodyType === 'DEPOSIT' || (txn.source === 'FINANCIAL' && txn.wageAmount > 0)) {
      return 'credit';
    }
    return 'debit';
  };

  const getAmount = (txn: Transaction): number => {
    // Deposits (any kind)
    if (txn.custodyType === 'DEPOSIT' || txn.depositType?.toUpperCase?.().includes('CREDIT')) {
      return txn.depositAmount || txn.amount || 0;
    }

    // POS Purchase
    if (txn.source === 'POS') {
      return txn.totalAmount || txn.amount || 0;
    }

    // Financial fallback
    return txn.amount || txn.wageAmount || 0;
  };



  const getTransactionDescription = (txn: Transaction): string => {
    if (txn.custodyType) return txn.custodyType;
    return 'Transaction';
  };

  const getWorkAssignName = (workAssign: WorkAssignId | string | null | undefined): string => {
    if (!workAssign) return 'N/A';
    if (typeof workAssign === 'string') return workAssign;
    return workAssign.name || 'N/A';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const isCredit = (txn: Transaction): boolean => {
    const type = txn.type?.toUpperCase?.();
    const custody = txn.custodyType?.toUpperCase?.();
    const depositType = txn.depositType?.toUpperCase?.();
    const source = txn.source?.toUpperCase?.();

    return (
      type === 'CREDIT' ||
      type === 'DEPOSIT' ||              // manual deposit cases
      custody === 'DEPOSIT' ||           // API style deposits
      depositType?.includes('CREDIT') || // MANUAL_CREDIT, ONLINE_CREDIT etc
      source === 'FINANCIAL' && type === 'DEPOSIT'
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => {

    try {
      const amount = getAmount(item);
      const workAssignName = getWorkAssignName(item.workAssignId);
      const { date, time } = formatDateTime(item.createdAt);
      const isPurchaseReversed = item.source === 'POS' && (item.isReversed || item.is_reversed);
      const purchaseItems = item.products?.map(product =>
        `${product.quantity}x ${product.productId.itemName}`
      ) || [];
      // Create description based on transaction type
      let description = '';
      if (item.depositName) {
        description = item.depositName;
        if (item.depositType) {
          description += ` (${item.depositType})`;
        }
      } else if (purchaseItems.length) {
        description = 'Purchase';
      } else {
        // Fallback to existing logic
        description = item.custodyType || workAssignName || item.transaction || 'Transaction';
      }

      const credit = isCredit(item) || isPurchaseReversed;

      return (
        <View style={styles.transactionItem}>
          <View style={styles.transactionInfo}>
            <View style={styles.transactionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.transactionDesc}>
                  {description}
                </Text>
                {purchaseItems.length > 0 && (
                  <View style={styles.purchaseItemsContainer}>
                    <Text style={styles.purchaseItemText}>
                      {purchaseItems.join(' | ')}{isPurchaseReversed ? ' (Reversed)' : ''}
                    </Text>
                  </View>
                )}
                {item.depositType && (
                  <Text style={styles.transactionType} numberOfLines={1}>
                    {item.depositType}
                  </Text>
                )}
                {item.products && item.products.length > 0 && (
                  <Text style={styles.transactionType} numberOfLines={1}>
                    {item.products.length} item{item.products.length > 1 ? 's' : ''}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.transactionAmount,
                credit ? styles.credit : styles.debit
              ]}>
                {credit ? '+' : '-'}₹{Math.abs(amount).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDate}>
                {date} • {time}
              </Text>
              {item.hoursWorked > 0 && (
                <Text style={styles.hoursWorked}>
                  {item.hoursWorked} hours worked
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    } catch (err) {
      return null;
    }
  };

  const handlePageChange = (pageNumber: number) => {
    // Ensure page number is within valid range (1 to totalPages)
    const newPage = Math.max(1, Math.min(pageNumber, Math.max(1, pagination.totalPages)));
    setPagination(prev => ({
      ...prev,
      page: newPage,
      // Ensure we don't show invalid page numbers
      totalPages: Math.max(1, prev.totalPages)
    }));
  };

  // Update transactions when page changes
  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, fetchTransactions]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#40407a" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retryText} onPress={() => setLoading(true)}>
          Tap to retry
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>No transactions found</Text>
          </View>
        }
      />
      {pagination.totalItems > 0 ? (
        pagination.totalItems >= 10 ? (
          <View style={styles.pagination}>
            {/* Pagination controls */}
            <TouchableOpacity
              style={[styles.pageButton, (pagination.page === 1 || !pagination.hasItems) && styles.disabledButton]}
              onPress={() => handlePageChange(1)}
              disabled={pagination.page === 1 || !pagination.hasItems}
            >
              <Text style={styles.pageText}>First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageButton, (pagination.page === 1 || !pagination.hasItems) && styles.disabledButton]}
              onPress={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1 || !pagination.hasItems}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageIndicator}>
              Page {Math.max(1, pagination.page)} of {Math.max(1, pagination.totalPages)}
            </Text>
            <TouchableOpacity
              style={[styles.pageButton, (pagination.page === pagination.totalPages || !pagination.hasItems) && styles.disabledButton]}
              onPress={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || !pagination.hasItems}
            >
              <Text style={styles.pageText}>
                <Ionicons name="chevron-forward" size={20} color="#" />
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageButton, (pagination.page === pagination.totalPages || !pagination.hasItems) && styles.disabledButton]}
              onPress={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages || !pagination.hasItems}
            >
              <Text style={styles.pageText}>Last</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.pagination, { justifyContent: 'center' }]}>
            <Text style={styles.noResultsText}>
              Showing {pagination.totalItems} transaction{pagination.totalItems !== 1 ? 's' : ''}
            </Text>
          </View>
        )
      ) : (
        <View style={[styles.pagination, { justifyContent: 'center' }]}>
          <Text style={styles.noResultsText}>
            {loading ? 'Loading...' : 'No transactions found'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#40407a",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDesc: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginRight: 10,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  transactionType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'normal',
    marginTop: 2,
  },
  purchaseItemsContainer: {
    marginTop: 4,
  },
  purchaseItemText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  hoursWorked: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'right',
  },
  credit: {
    color: '#2ecc71',
  },
  debit: {
    color: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  retryText: {
    color: '#3498db',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  pageButton: {
    padding: 8,
    paddingHorizontal: 15,
    backgroundColor: '#40407a',
    borderRadius: 5,
    marginHorizontal: 5,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  pageText: {
    color: '#fff',
    fontWeight: '500',
  },
  pageIndicator: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#666',
    minWidth: 100,
    textAlign: 'center',
  },
  noResultsText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
