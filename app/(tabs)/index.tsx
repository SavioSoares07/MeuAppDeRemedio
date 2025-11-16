import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { registerForPushNotificationsAsync } from '@/utils/notificationsConfig';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Chave para salvar os dados no celular
const APP_STORAGE_KEY = '@MedicamentoApp:lembretes';

// Definindo o "formato" de um lembrete
interface Reminder {
  id: string;
  patientName: string;
  medName: string;
  medQuantity: string;
  time: Date;
  notificationId?: string;
}

// notificações
useEffect(() => {
  registerForPushNotificationsAsync();
}, []);

export default function TabOneScreen() {
  const [patientName, setPatientName] = useState('');
  const [medName, setMedName] = useState('');
  const [medQuantity, setMedQuantity] = useState('');
  const router = useRouter();
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadReminders();
    }, [])
  );

  // ---- Funções de Armazenamento (AsyncStorage) ----
  const loadReminders = async () => {
    try {
      const storedReminders = await AsyncStorage.getItem(APP_STORAGE_KEY);
      if (storedReminders !== null) {
        const parsedReminders: Reminder[] = JSON.parse(storedReminders).map(
          (item: Reminder) => ({
            ...item,
            time: new Date(item.time),
          })
        );
        setReminders(parsedReminders);
      }
    } catch (e) {
      console.error('Erro ao carregar lembretes', e);
    }
  };

  const saveReminders = async (newReminders: Reminder[]) => {
    try {
      const jsonValue = JSON.stringify(newReminders);
      await AsyncStorage.setItem(APP_STORAGE_KEY, jsonValue);
    } catch (e) {
      console.error('Erro ao salvar lembretes', e);
    }
  };

  // ---- Manipuladores de Eventos ----
  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentDate);
  };

 

  const handleAddReminder = async (
    patientName: string,
    medName: string,
    medQuantity: string,
    time: Date
  ) => {
    if (!patientName.trim() || !medName.trim() || !medQuantity.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome do paciente e do remédio.');
      return;
    }

    const now = new Date();
    let triggerDate = new Date(time);
    triggerDate.setSeconds(0);

    // Se o horário já passou hoje, agenda para o próximo dia
    if (triggerDate <= now) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }

    // Ajuste para Android e iOS
    let trigger: Notifications.CalendarTriggerInput | Notifications.TimeIntervalTriggerInput;

    if (Platform.OS === 'ios') {
      // iOS: trigger calendar para horário exato
      trigger = {
        type: 'calendar',
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
      } as Notifications.CalendarTriggerInput;
    } else {
      // Android: trigger timeInterval com intervalo até o horário e repetição diária
      const secondsUntilTrigger = Math.round((triggerDate.getTime() - now.getTime()) / 1000);

      trigger = {
        type: 'timeInterval',
        seconds: secondsUntilTrigger > 0 ? secondsUntilTrigger : 1,
        repeats: true,
      } as Notifications.TimeIntervalTriggerInput;
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hora do medicamento 💊',
          body: `${patientName}, é hora de tomar ${medName} (${medQuantity})!`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
      });

      console.log('🔔 Notificação agendada com sucesso! ID:', notificationId);
      Alert.alert(
        'Lembrete criado',
        `Lembrete para ${medName} às ${triggerDate
          .getHours()
          .toString()
          .padStart(2, '0')}:${triggerDate.getMinutes().toString().padStart(2, '0')} configurado!`
      );

      // Adiciona lembrete com notificationId para poder cancelar depois
      const newReminder: Reminder = {
        id: Math.random().toString(36).substr(2, 9), // gera id simples
        patientName,
        medName,
        medQuantity,
        time: triggerDate,
        notificationId,
      };

      const updatedReminders = [...reminders, newReminder];
      setReminders(updatedReminders);
      await saveReminders(updatedReminders);
    } catch (error) {
      console.error('Erro ao agendar notificação:', error);
      Alert.alert('Erro', 'Não foi possível agendar a notificação.');
    }
  };

  // ---- Função: Excluir Lembrete ----
  const handleDeleteReminder = (id: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Você tem certeza que quer apagar este lembrete?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            const reminderToDelete = reminders.find((item) => item.id === id);

            if (reminderToDelete?.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(reminderToDelete.notificationId);
            }

            const updatedReminders = reminders.filter((item) => item.id !== id);
            setReminders(updatedReminders);
            await saveReminders(updatedReminders);
          },
        },
      ]
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemPatient}>{item.patientName}</Text>
        <Text style={styles.itemMed}>{item.medName}</Text>
        <Text style={styles.itemMedQuantity}>{item.medQuantity}</Text>
        <Text style={styles.itemTime}>{formatTime(item.time)}</Text>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            router.push({
              pathname: '/modal',
              params: { reminder: JSON.stringify(item) },
            });
          }}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteReminder(item.id)}
        >
          <Text style={styles.actionButtonText}>Apagar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={reminders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.formContainer}>
            <Text style={styles.title}>Novo Lembrete</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do Paciente"
              placeholderTextColor="#999"
              value={patientName}
              onChangeText={setPatientName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nome do Remédio"
              placeholderTextColor="#999"
              value={medName}
              onChangeText={setMedName}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantidade do Remédio"
              placeholderTextColor="#999"
              value={medQuantity}
              onChangeText={setMedQuantity}
            />
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              style={styles.timeButton}
            >
              <Text style={styles.timeButtonText}>
                Horário: {formatTime(time)}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={time}
                mode={'time'}
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
              />
            )}
            <Button
              title="Adicionar lembrete"
              onPress={() => handleAddReminder(patientName, medName, medQuantity, time)}
            />
            <Text style={styles.listTitle}>Lembretes Salvos</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#fff',
    color: '#000',
  },
  timeButton: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#000',
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#111',
  },
  itemContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPatient: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  itemMed: {
    fontSize: 16,
    color: '#333',
  },
  itemMedQuantity: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  itemTime: {
    fontSize: 16,
    color: '#007BFF',
    marginTop: 5,
    fontWeight: 'bold',
  },
  itemTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemActions: {
    flexDirection: 'column',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  editButton: {
    backgroundColor: '#007BFF',
    marginBottom: 5,
  },
  deleteButton: {
    backgroundColor: '#DC3545',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
});
