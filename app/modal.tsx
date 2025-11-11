import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Reutilize as definições
const APP_STORAGE_KEY = '@MedicamentoApp:lembretes';
interface Reminder {
  id: string;
  patientName: string;
  medName: string;
  medQuantity: string;
  time: Date;
}



export default function ModalScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // Pega os parâmetros passados (o lembrete)

  // Estado para o lembrete que está sendo editado
  const [reminder, setReminder] = useState<Reminder | null>(null);

  // Estado para os campos do formulário
  const [patientName, setPatientName] = useState('');
  const [medName, setMedName] = useState('');
  const [medQuantity, setMedQuantity] = useState('');
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Efeito para carregar os dados do lembrete quando o modal abre
  useEffect(() => {
    if (params.reminder) {
      const reminderData: Reminder = JSON.parse(params.reminder as string);
      // Converte a string de data de volta para um objeto Date
      reminderData.time = new Date(reminderData.time);

      setReminder(reminderData);
      setPatientName(reminderData.patientName);
      setMedName(reminderData.medName);
      setMedQuantity(reminderData.medQuantity);
      setTime(reminderData.time);
    }
  }, [params.reminder]);

  const onTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentDate);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Função para salvar as alterações
  const handleSaveEdit = async () => {
    if (!reminder || !patientName.trim() || !medName.trim() || !medQuantity.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    const updatedReminder: Reminder = {
      ...reminder,
      patientName: patientName,
      medName: medName,
      medQuantity: medQuantity,
      time: time,
    };

    try {
      // 1. Carregar a lista completa do AsyncStorage
      const storedReminders = await AsyncStorage.getItem(APP_STORAGE_KEY);
      let reminders: Reminder[] = [];
      if (storedReminders !== null) {
        reminders = JSON.parse(storedReminders).map((item: Reminder) => ({
          ...item,
          time: new Date(item.time),
        }));
      }

      // 2. Mapear a lista e substituir o item antigo pelo novo
      const updatedList = reminders.map((item) =>
        item.id === updatedReminder.id ? updatedReminder : item
      );

      // 3. Salvar a lista atualizada de volta no AsyncStorage
      await AsyncStorage.setItem(APP_STORAGE_KEY, JSON.stringify(updatedList));

      // 4. Fechar o modal
      router.back();
    } catch (e) {
      console.error('Erro ao salvar edição', e);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    }
  };

  if (!reminder) {
    // Tela de carregamento enquanto os dados do lembrete não chegam
    return <Text>Carregando...</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Editar Lembrete</Text>
      <View style={styles.formContainer}>
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
        <Button title="Salvar Alterações" onPress={handleSaveEdit} />
      </View>

      {/* Use a light status bar on iOS to account for the black background */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </SafeAreaView>
  );
}

// Estilos para o Modal (você pode ajustar)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formContainer: {
    width: '90%',
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
});