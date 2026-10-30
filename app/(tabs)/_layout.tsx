import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const screens: { name: string; title: string; icon: IconName }[] = [
  { name: 'feed', title: 'Feed', icon: 'home' },
  { name: 'trending', title: 'Trending', icon: 'flame' },
  { name: 'search', title: 'Pesquisa', icon: 'search' },
  { name: 'profile', title: 'Perfil', icon: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      {screens.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name={icon}
                size={size}
                color={focused ? colors.accent : colors.textMuted}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
