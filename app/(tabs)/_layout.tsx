import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme';

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
        headerShadowVisible: false,
        headerTintColor: colors.paper,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 22 },
        tabBarStyle: { backgroundColor: colors.sleeve, borderTopColor: colors.groove },
        tabBarActiveTintColor: colors.mustard,
        tabBarInactiveTintColor: colors.fog,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 12 },
      }}
    >
      {screens.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, size }) => (
              <Ionicons name={icon} size={size} color={focused ? colors.mustard : colors.fog} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
