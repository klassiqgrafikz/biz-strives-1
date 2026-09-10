import React from 'react'
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native'
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from '@react-navigation/drawer'
import { Appbar } from 'react-native-paper'
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons'
import { COLORS } from '../utils/constants'
import { useAuth } from '../context/AuthContext'

import DashboardScreen from '../screens/DashboardScreen'
import CustomersScreen from '../screens/CustomersScreen'
import PaymentsScreen from '../screens/PaymentsScreen'
import ExpensesScreen from '../screens/ExpensesScreen'
import SavingsScreen from '../screens/SavingsScreen'
import ReportsScreen from '../screens/ReportsScreen'
import MessagesScreen from '../screens/MessagesScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import SettingsScreen from '../screens/SettingsScreen'

const Drawer = createDrawerNavigator()

const NAV_ITEMS = [
  { name: 'Dashboard', label: 'Dashboard', icon: 'view-dashboard' },
  { name: 'Customers', label: 'Customers', icon: 'account-group' },
  { name: 'Payments', label: 'Payments', icon: 'cash' },
  { name: 'Expenses', label: 'Expenses', icon: 'receipt' },
  { name: 'Savings', label: 'Savings', icon: 'piggy-bank' },
  { name: 'Reports', label: 'Reports', icon: 'chart-bar' },
  { name: 'Messages', label: 'Messages', icon: 'email' },
  { name: 'Notifications', label: 'Notifications', icon: 'bell' },
  { name: 'Settings', label: 'Settings', icon: 'cog' },
]

const SCREENS = {
  Dashboard: DashboardScreen,
  Customers: CustomersScreen,
  Payments: PaymentsScreen,
  Expenses: ExpensesScreen,
  Savings: SavingsScreen,
  Reports: ReportsScreen,
  Messages: MessagesScreen,
  Notifications: NotificationsScreen,
  Settings: SettingsScreen,
}

function ScreenHeader({ title, navigation }) {
  return (
    <Appbar.Header style={{ backgroundColor: COLORS.primary }}>
      <Appbar.Action icon="menu" color="#fff" onPress={() => navigation.toggleDrawer()} />
      <Appbar.Content title={title} titleStyle={{ color: '#fff', fontWeight: '700' }} />
    </Appbar.Header>
  )
}

function DrawerContent(props) {
  const { logout, user } = useAuth()
  const { state, navigation } = props
  const active = state.routeNames[state.index]

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContent}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>Biz Strives</Text>
        <Text style={styles.brandUser}>{user?.username || ''}</Text>
      </View>
      {NAV_ITEMS.map((item) => {
        const focused = active === item.name
        return (
          <TouchableOpacity
            key={item.name}
            style={[styles.item, focused && styles.itemActive]}
            onPress={() => {
              navigation.navigate(item.name)
              navigation.closeDrawer()
            }}
          >
            <MaterialDesignIcons
              name={item.icon}
              size={24}
              color={focused ? COLORS.primary : COLORS.textSecondary}
            />
            <Text style={[styles.itemLabel, focused && styles.itemLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        )
      })}
      <TouchableOpacity style={[styles.item, styles.logout]} onPress={logout}>
        <MaterialDesignIcons name="logout" size={24} color={COLORS.danger} />
        <Text style={[styles.itemLabel, styles.logoutLabel]}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  )
}

export default function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation, route }) => {
        const item = NAV_ITEMS.find((n) => n.name === route.name)
        return {
          header: () => (
            <ScreenHeader title={item?.label || route.name} navigation={navigation} />
          ),
          drawerActiveTintColor: COLORS.primary,
          drawerInactiveTintColor: COLORS.textSecondary,
        }
      }}
    >
      {NAV_ITEMS.map((item) => (
        <Drawer.Screen key={item.name} name={item.name} component={SCREENS[item.name]} />
      ))}
    </Drawer.Navigator>
  )
}

const styles = StyleSheet.create({
  drawerContent: {
    flexGrow: 1,
  },
  brand: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
    backgroundColor: COLORS.primary,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  brandUser: {
    fontSize: 12,
    color: COLORS.primaryLight,
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  itemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  itemLabel: {
    marginLeft: 20,
    fontSize: 15,
    color: COLORS.text,
  },
  itemLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  logout: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
  },
  logoutLabel: {
    color: COLORS.danger,
  },
})