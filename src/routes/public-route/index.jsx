import React from 'react'
import { Route, Redirect } from 'react-router-dom'

export const PublicRoute = ({ comp: Component, ...rest }) => {
  const user = null

  const conditionRender = () => {
    if (!user) return <Component />

    return <Redirect to='/' />
  }

  return <Route exact {...rest} render={conditionRender} />
}
