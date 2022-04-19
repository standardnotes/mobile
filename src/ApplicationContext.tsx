import { MobileApplication } from '@Lib/application'
import React from 'react'

export const ApplicationContext = React.createContext<
  MobileApplication | undefined
>(undefined)
