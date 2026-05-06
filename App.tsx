import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import { GlobalErrorHandler, ErrorBoundary } from './src/components/GlobalErrorHandler';
import { MaterialIcons } from '@expo/vector-icons';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import ReproductionScreen from './src/screens/ReproductionScreen';
import NutritionScreen from './src/screens/NutritionScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import PlanificationScreen from './src/screens/PlanificationScreen';
import ParametresScreen from './src/screens/ParametresScreen';
import CollaborationScreen from './src/screens/CollaborationScreen';
import MortalitesScreen from './src/screens/MortalitesScreen';
import PorcDetailScreen from './src/screens/PorcDetailScreen';
import GestationDetailScreen from './src/screens/GestationDetailScreen';
import TransactionDetailScreen from './src/screens/TransactionDetailScreen';

const Tab = createBottomTabNavigator();

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <GlobalErrorHandler>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName: React.ComponentProps<typeof MaterialIcons>['name'];

                  switch (route.name) {
                    case 'Dashboard':
                      iconName = 'dashboard';
                      break;
                    case 'Reproduction':
                      iconName = 'pets';
                      break;
                    case 'Nutrition':
                      iconName = 'restaurant';
                      break;
                    case 'Finance':
                      iconName = 'account-balance-wallet';
                      break;
                    case 'Reports':
                      iconName = 'assessment';
                      break;
                    case 'Planification':
                      iconName = 'schedule';
                      break;
                    case 'Parametres':
                      iconName = 'settings';
                      break;
                    case 'Collaboration':
                      iconName = 'group';
                      break;
                    case 'Mortalites':
                      iconName = 'pets';
                      break;
                    default:
                      iconName = 'help';
                  }

                  return <MaterialIcons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#2E7D32',
                tabBarInactiveTintColor: 'gray',
                headerStyle: {
                  backgroundColor: '#2E7D32',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              })}
            >
              <Tab.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'Tableau de bord' }}
              />
              <Tab.Screen 
                name="Reproduction" 
                component={ReproductionScreen}
                options={{ title: 'Reproduction' }}
              />
              <Tab.Screen 
                name="Nutrition" 
                component={NutritionScreen}
                options={{ title: 'Nutrition' }}
              />
              <Tab.Screen 
                name="Finance" 
                component={FinanceScreen}
                options={{ title: 'Finance' }}
              />
              <Tab.Screen 
                name="Reports" 
                component={ReportsScreen}
                options={{ title: 'Rapports' }}
              />
              <Tab.Screen 
                name="Planification" 
                component={PlanificationScreen}
                options={{ title: 'Planification' }}
              />
              <Tab.Screen 
                name="Parametres" 
                component={ParametresScreen}
                options={{ title: 'Paramètres' }}
              />
              <Tab.Screen 
                name="Collaboration" 
                component={CollaborationScreen}
                options={{ title: 'Collaboration' }}
              />
              <Tab.Screen 
                name="Mortalites" 
                component={MortalitesScreen}
                options={{ title: 'Mortalités' }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </GlobalErrorHandler>
      </ErrorBoundary>
    </Provider>
  );
};

export default App;
