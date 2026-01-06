import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const CATEGORIES = ['All', 'Work', 'Personal', 'Shopping', 'Health'];

export default function TasksScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Load tasks when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('@sk_tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
    }
  };

  const saveTasks = async (currentTasks: Task[]) => {
    try {
      await AsyncStorage.setItem('@sk_tasks', JSON.stringify(currentTasks));
      setTasks(currentTasks);
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  };

  const handleAddTask = (title: string, category: string) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      category: category,
      date: new Date().toLocaleDateString(),
    };

    const updatedTasks = [newTask, ...tasks];
    saveTasks(updatedTasks);
  };

  const toggleTask = (id: string) => {
    const updatedTasks = tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    );
    saveTasks(updatedTasks);
  };

  const deleteTask = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this task?")) {
        const updatedTasks = tasks.filter(task => task.id !== id);
        saveTasks(updatedTasks);
      }
    } else {
      Alert.alert(
        "Delete Task",
        "Are you sure you want to delete this task?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => {
            const updatedTasks = tasks.filter(task => task.id !== id);
            saveTasks(updatedTasks);
          }}
        ]
      );
    }
  };

  const filteredTasks = selectedCategory === 'All' 
    ? tasks 
    : tasks.filter(task => task.category === selectedCategory);

  const activeCount = tasks.filter(t => !t.completed).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>My Tasks</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>{activeCount} tasks remaining today</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setIsModalVisible(true)}>
          <IconSymbol name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Categories Filter */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip, 
                { 
                  backgroundColor: selectedCategory === cat ? colors.primary : colors.surface,
                  borderColor: selectedCategory === cat ? colors.primary : 'transparent',
                }
              ]}>
              <Text style={[
                styles.categoryText, 
                { color: selectedCategory === cat ? '#fff' : colors.text }
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Task List */}
      <ScrollView 
        contentContainerStyle={styles.taskList}
        showsVerticalScrollIndicator={false}
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="list.bullet" size={64} color={colors.surface} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No tasks found</Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <TouchableOpacity 
              key={task.id} 
              style={[styles.taskItem, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
              onLongPress={() => deleteTask(task.id)}
              delayLongPress={500}
            >
              <TouchableOpacity onPress={() => toggleTask(task.id)} style={styles.checkButton}>
                <IconSymbol 
                    name={task.completed ? "checkmark.circle.fill" : "circle"} 
                    size={24} 
                    color={task.completed ? colors.primary : colors.icon} 
                />
              </TouchableOpacity>
              
              <View style={styles.taskContent}>
                <Text style={[
                  styles.taskTitle, 
                  { 
                    color: colors.text,
                    textDecorationLine: task.completed ? 'line-through' : 'none',
                    opacity: task.completed ? 0.5 : 1
                  }
                ]}>{task.title}</Text>
                <View style={[styles.taskMeta]}>
                  <Text style={[styles.taskCategory, { color: colors.primary }]}>{task.category}</Text>
                  <Text style={[styles.taskDate, { color: colors.icon }]}>{task.date}</Text>
                </View>
              </View>
              
              <TouchableOpacity onPress={() => deleteTask(task.id)} style={styles.deleteButton}>
                 <IconSymbol name="xmark.circle.fill" size={20} color={colors.icon} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoriesWrapper: {
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 24,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  categoryText: {
    fontWeight: '600',
    fontSize: 14,
  },
  taskList: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  checkButton: {
    marginRight: 16,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  taskDate: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
  },
});
