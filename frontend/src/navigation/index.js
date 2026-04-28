import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { AuthContext } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import PickDetailScreen from '../screens/PickDetailScreen';
import ParlayScreen from '../screens/ParlayScreen';
import MarketsScreen from '../screens/MarketsScreen';
import MarketDetailScreen from '../screens/MarketDetailScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icon helper
function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

// Bottom tab navigator (shown when logged in)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f0f',
          borderTopColor: '#1f1f1f',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#f0c040',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Picks',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Parlay"
        component={ParlayScreen}
        options={{
          tabBarLabel: 'Parlay',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Markets"
        component={MarketsStack}
        options={{
          tabBarLabel: 'Markets',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          tabBarLabel: 'Plans',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⭐" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// Home stack (Picks feed → Pick detail)
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a', shadowColor: 'transparent' },
        headerTintColor: '#f0c040',
        headerTitleStyle: { fontWeight: '700', color: '#ffffff' },
        cardStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'IntellaBets' }}
      />
      <Stack.Screen
        name="PickDetail"
        component={PickDetailScreen}
        options={{ title: 'Pick Detail' }}
      />
    </Stack.Navigator>
  );
}

// Markets stack (Prediction Markets feed → Market Detail)
function MarketsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a', shadowColor: 'transparent' },
        headerTintColor: '#f0c040',
        headerTitleStyle: { fontWeight: '700', color: '#ffffff' },
        cardStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen
        name="MarketsMain"
        component={MarketsScreen}
        options={{ title: '📈 Prediction Markets' }}
      />
      <Stack.Screen
        name="MarketDetail"
        component={MarketDetailScreen}
        options={{ title: 'Market Analysis' }}
      />
    </Stack.Navigator>
  );
}

// Auth stack (shown when logged out)
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Root navigator — switches between auth and main based on login state
export default function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#f0c040" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}
