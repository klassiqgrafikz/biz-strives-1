import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import AuthStack from './AuthStack'
import MainDrawer from './MainDrawer'
import { LoadingSpinner } from '../components/EmptyState'

export default function RootNavigator() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner text="Loading..." />

  return (
    <NavigationContainer>
      {user ? <MainDrawer /> : <AuthStack />}
    </NavigationContainer>
  )
}
