import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useFocusEffect, useRouter } from 'expo-router'; // Adicione useRouter
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
// NOVAS IMPORTAÇÕES

// Chave para salvar os dados no celular
const APP_STORAGE_KEY = '@MedicamentoApp:lembretes';

// Definindo o "formato" de um lembrete (bom para TypeScript)
interface Reminder {
  id: string;
  patientName: string;
  medName: string;
  medQuantity: string;
  time: Date;
}

export default function TabOneScreen() {
  const [patientName, setPatientName] = useState('');
  const [medName, setMedName] = useState('');
  const [medQuantity, setMedQuantity] = useState('');
  const router = useRouter(); // <-- ADICIONE ESTA LINHA
  const [time, setTime] = useState(new Date());
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  interface Reminder {
  id: string;
  patientName: string;
  medName: string;
  medQuantity: string;
  time: Date;
  notificationId?: string; // <-- ADICIONE ESTA LINHA
}

  // ---- MUDANÇA IMPORTANTE: de useEffect para useFocusEffect ----
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
  const onTimeChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentDate);
  };

  const handleAddReminder = async () => {
    if (!patientName.trim() || !medName.trim() || !medQuantity.trim()) {
      Alert.alert(
        'Erro',
        'Por favor, preencha o nome do paciente e do remédio.'
      );
      return;
    }
    const newReminder: Reminder = {
      id: Date.now().toString(),
      patientName: patientName,
      medName: medName,
      medQuantity: medQuantity,
      time: time,
    };
    const updatedReminders = [...reminders, newReminder];
    setReminders(updatedReminders);
    await saveReminders(updatedReminders);
    setPatientName('');
    setMedName('');
    setMedQuantity('');
    setTime(new Date());
  };

  // ---- NOVA FUNÇÃO: Excluir Lembrete ----
  const handleDeleteReminder = (id: string) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Você tem certeza que quer apagar este lembrete?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
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

// ---- ATUALIZAÇÃO: Renderização do Item da Lista (com router.push) ----
  const renderItem = ({ item }: { item: Reminder }) => (
    <View style={styles.itemContainer}>
      {/* Container do Texto */}
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemPatient}>{item.patientName}</Text>
        <Text style={styles.itemMed}>{item.medName}</Text>
        <Text style={styles.itemMedQuantity}>{item.medQuantity}</Text>
        <Text style={styles.itemTime}>{formatTime(item.time)}</Text>
      </View>

      {/* Container dos Botões */}
      <View style={styles.itemActions}>
        {/* ---- MUDANÇA AQUI ---- */}
        {/* Agora é um TouchableOpacity que chama router.push */}
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
            router.push({
              pathname: '/modal', // Navega para a tela modal
              params: { reminder: JSON.stringify(item) }, // Passa os dados
            });
          }}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        {/* ---- FIM DA MUDANÇA ---- */}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteReminder(item.id)}
        >
          <Text style={styles.actionButtonText}>Apagar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ---- Renderização Principal (JSX) - (Sem alterações no formulário) ----
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={reminders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        // Coloca o formulário no cabeçalho da lista
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
            <Button title="Adicionar Lembrete" onPress={handleAddReminder} />
            <Text style={styles.listTitle}>Lembretes Salvos</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ---- ATUALIZAÇÃO: Estilos ----
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
    flexDirection: 'row', // Para alinhar botões ao lado
    justifyContent: 'space-between', // Separa o texto das ações
    alignItems: 'center', // Alinha verticalmente
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
    fontStyle: 'italic'
  },
  itemTime: {
    fontSize: 16,
    color: '#007BFF',
    marginTop: 5,
    fontWeight: 'bold',
  },

  // **** ESTILO QUE FALTAVA ADICIONADO AQUI ****
  itemTextContainer: {
    flex: 1, // <--- Esta é a mudança chave! Faz o texto encolher.
    marginRight: 10, // Adiciona um espaço antes dos botões.
  },

  // ESTILOS ATUALIZADOS
  itemActions: {
    flexDirection: 'column', // Empilha os botões
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    // marginLeft: 10, // <-- REMOVIDO para melhorar alinhamento
  },
  editButton: {
    backgroundColor: '#007BFF', // Azul
    marginBottom: 5, // Espaço entre os botões
  },
  deleteButton: {
    backgroundColor: '#DC3545', // Vermelho
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center', // <-- ADICIONADO para centralizar o texto
  },
});