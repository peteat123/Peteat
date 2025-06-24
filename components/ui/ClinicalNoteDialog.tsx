import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/Typography';

interface Vitals {
  weight?: string;
  temperature?: string;
  crt?: string;
  skinTenting?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { vitals: Vitals; diagnosis: string; treatmentPlan: string; prescription: string; additionalNotes: string }) => void;
}

const ClinicalNoteDialog: React.FC<Props> = ({ visible, onClose, onSave }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [vitals, setVitals] = useState<Vitals>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [prescription, setPrescription] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const reset = () => {
    setVitals({});
    setDiagnosis('');
    setTreatmentPlan('');
    setPrescription('');
    setAdditionalNotes('');
  };

  const handleSave = () => {
    onSave({ vitals, diagnosis, treatmentPlan, prescription, additionalNotes });
    reset();
  };

  const renderInput = (label: string, value: string, setter: (v: string) => void, placeholder?: string) => (
    <View style={styles.inputGroup}>
      <Text style={[Typography.nunitoBodyMedium, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
        placeholder={placeholder || label}
        placeholderTextColor={colors.border}
        value={value}
        onChangeText={setter}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[Typography.nunitoHeading3, { color: colors.text, marginBottom: 12 }]}>Clinical Note</Text>
        <ScrollView style={{ flex: 1 }}>
          {renderInput('Weight (kg)', vitals.weight || '', (v) => setVitals({ ...vitals, weight: v }))}
          {renderInput('Temperature (°C)', vitals.temperature || '', (v) => setVitals({ ...vitals, temperature: v }))}
          {renderInput('CRT (s)', vitals.crt || '', (v) => setVitals({ ...vitals, crt: v }))}
          {renderInput('Diagnosis', diagnosis, setDiagnosis)}
          {renderInput('Treatment Plan', treatmentPlan, setTreatmentPlan)}
          {renderInput('Prescription', prescription, setPrescription)}
          {renderInput('Additional Notes', additionalNotes, setAdditionalNotes)}
        </ScrollView>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.error }]} onPress={onClose}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.success }]} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default ClinicalNoteDialog; 