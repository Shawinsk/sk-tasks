import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddTaskModal } from '@/components/AddTaskModal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  date: string;
}

const CATEGORY_NAMES = ['Work', 'Personal', 'Shopping', 'Health'];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; count: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('@sk_tasks');
      const loadedTasks: Task[] = storedTasks ? JSON.parse(storedTasks) : [];
      setTasks(loadedTasks);

      // Calculate category counts
      const categoryCounts = CATEGORY_NAMES.map((name, index) => ({
        id: index.toString(),
        name,
        count: loadedTasks.filter(t => t.category === name && !t.completed).length
      }));
      setCategories(categoryCounts);

    } catch (e) {
      console.error('Failed to load tasks', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddTask = async (title: string, category: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      category: category,
      date: new Date().toLocaleDateString(),
    };

    const updatedTasks = [newTask, ...tasks];
    setTasks(updatedTasks);
    
    // Update categories count locally to reflect change immediately
    const updatedCategories = categories.map(cat => {
      if (cat.name === category) {
        return { ...cat, count: cat.count + 1 };
      }
      return cat;
    });
    setCategories(updatedCategories);

    try {
      await AsyncStorage.setItem('@sk_tasks', JSON.stringify(updatedTasks));
    } catch (e) {
      console.error('Failed to save task', e);
    }
  };

  const toggleTask = async (id: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    
    // Recalculate counts
    const categoryCounts = CATEGORY_NAMES.map((name, index) => ({
      id: index.toString(),
      name,
      count: updatedTasks.filter(t => t.category === name && !t.completed).length
    }));
    setCategories(categoryCounts);

    try {
      await AsyncStorage.setItem('@sk_tasks', JSON.stringify(updatedTasks));
    } catch (e) {
      console.error('Failed to save task', e);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Search Logic
  const displayedTasks = searchQuery.length > 0 
    ? tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.icon }]}>Good Morning,</Text>
            <Text style={[styles.title, { color: colors.text }]}>SK User</Text>
          </View>
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surface }]}>
            <IconSymbol name="bell.fill" size={24} color={colors.primary} />
            <View style={styles.badge} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput 
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tasks..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Progress Card (Hide when searching to reduce clutter?) - Optional, keeping for now */}
        {searchQuery.length === 0 && (
          <View style={[styles.card, { backgroundColor: colors.primary }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Daily Progress</Text>
              <Text style={styles.cardPercentage}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.cardSubtitle}>{completedCount}/{totalCount} tasks completed</Text>
          </View>
        )}

        {/* Categories (Hide when searching) */}
        {searchQuery.length === 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.categoryCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                  <Text style={[styles.categoryCount, { color: colors.icon }]}>{cat.count} tasks</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Task List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {searchQuery.length > 0 ? 'Search Results' : 'Recent Tasks'}
          </Text>
          {searchQuery.length === 0 && (
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          )}
        </View>
        
        <View style={styles.taskList}>
          {displayedTasks.length === 0 ? (
             <Text style={{  color: colors.icon, textAlign: 'center', marginTop: 20 }}>
               {searchQuery.length > 0 ? 'No tasks match your search.' : 'No tasks yet. Add one!'}
             </Text>
          ) : (
            displayedTasks.map((task) => (
              <TouchableOpacity key={task.id} style={[styles.taskItem, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
                <View style={styles.taskLeft}>
                  <TouchableOpacity onPress={() => toggleTask(task.id)}>
                    <IconSymbol 
                      name={task.completed ? "checkmark.circle.fill" : "circle"} 
                      size={24} 
                      color={task.completed ? colors.primary : colors.icon} 
                    />
                  </TouchableOpacity>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskTitle, { 
                      color: colors.text,
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.6 : 1
                    }]}>{task.title}</Text>
                    <Text style={[styles.taskTime, { color: colors.icon }]}>{task.date}</Text>
                  </View>
                </View>
                <View style={[styles.taskTag, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.taskTagText, { color: colors.icon }]}>{task.category}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => setIsModalVisible(true)}
      >
        <IconSymbol name="plus" size={32} color="#fff" />
      </TouchableOpacity>
      
      {/* Add Task Modal */}
      <AddTaskModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onAddTask={handleAddTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  iconButton: {
    padding: 10,
    borderRadius: 12,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
    borderWidth: 1,
    borderColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cardPercentage: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    marginBottom: 12,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesContainer: {
    marginBottom: 32,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  categoryCard: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 100,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
  },
  taskList: {
    gap: 16,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskInfo: {
    gap: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskTime: {
    fontSize: 12,
  },
  taskTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  taskTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

