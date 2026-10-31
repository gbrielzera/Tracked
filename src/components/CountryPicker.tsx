import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Country, flagOf } from '@/lib/countries';
import { colors, fonts, radius, spacing, type } from '@/theme';

type Props = {
  visible: boolean;
  title: string;
  countries: Country[];
  selected: string | null;
  // Primeira linha da lista, que limpa a escolha (ex.: "Global" ou "Não informar").
  noneLabel: string;
  noneIcon?: string;
  onSelect: (code: string | null) => void;
  onClose: () => void;
};

// "Brasil" casa com "brasil" e "Peru" com "péru": compara sem acento e sem maiúsculas.
const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Row = { key: string; code: string | null; label: string; flag: string };

// Folha inferior com busca para escolher um país.
export function CountryPicker({ visible, title, countries, selected, noneLabel, noneIcon = '🌍', onSelect, onClose }: Props) {
  const [filter, setFilter] = useState('');

  const rows = useMemo<Row[]>(() => {
    const term = plain(filter.trim());
    const matches = countries
      .filter((country) => term === '' || plain(country.name).includes(term))
      .map((country) => ({ key: country.code, code: country.code, label: country.name, flag: flagOf(country.code) }));
    return term === '' ? [{ key: 'none', code: null, label: noneLabel, flag: noneIcon }, ...matches] : matches;
  }, [filter, countries, noneLabel, noneIcon]);

  const close = () => {
    setFilter('');
    onClose();
  };
  const choose = (code: string | null) => {
    setFilter('');
    onSelect(code);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.fog} />
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Buscar país"
              placeholderTextColor={colors.fog}
              selectionColor={colors.mustard}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Buscar país"
              style={styles.searchInput}
            />
          </View>
          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum país encontrado.</Text>}
            renderItem={({ item }) => {
              const isSelected = item.code === selected;
              return (
                <Pressable
                  onPress={() => choose(item.code)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={[styles.optionLabel, isSelected && styles.optionSelected]}>{item.label}</Text>
                  {isSelected ? <Ionicons name="checkmark" size={20} color={colors.mustard} /> : null}
                </Pressable>
              );
            }}
          />
          <Pressable onPress={close} accessibilityRole="button" style={styles.cancel}>
            <Text style={styles.cancelLabel}>Cancelar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.sleeve,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { ...type.subtitle, color: colors.paper },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: radius.field,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.groove,
  },
  searchInput: { flex: 1, color: colors.paper, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 8 },
  list: { flexGrow: 0 },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.field,
  },
  pressed: { backgroundColor: colors.groove },
  flag: { fontSize: 24, width: 32, textAlign: 'center' },
  optionLabel: { ...type.body, color: colors.paper, flex: 1 },
  optionSelected: { fontFamily: fonts.bold },
  empty: { ...type.body, color: colors.fog, textAlign: 'center', padding: spacing.lg },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.teal },
});
